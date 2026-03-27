import Link from 'next/link';
import styles from '../../teacher.module.css';
import { getStudentById, getStudentSubmissions, getStudentNotes } from '@/lib/teacher-data';
import {
  getAcademicPacingStyle,
  getEngagementStyle,
  formatDaysOffset,
} from '@/lib/pacing';
import {
  getStudentWrittenResponses,
  getStudentArtifacts,
  getStudentOutcomeMastery,
  getStudentUnitProgress,
  getLastAcademicEvent,
  getMasteryStyle,
  getSubmissionTypeLabel,
} from '@/lib/evidence-data';
import { getInitials, getEngagementLabel, formatDate, formatShortDate } from '@/lib/helpers';
import { getTeacherId } from '@/lib/teacher-auth';
import { resolveContext, buildContextQuery} from '@/lib/teacher-context';
import { prisma } from '@/lib/db';
import { isDemoMode } from '@/lib/teacher-auth';
import StudentActions from './StudentActions';

// ---------- Types ----------

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// ---------- Page Component ----------

export default async function StudentDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const teacherId = await getTeacherId();
  const ctx = await resolveContext(sp, teacherId);
  const q = buildContextQuery(ctx);

  const student = await getStudentById(id, teacherId, ctx);

  if (!student) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>❌</div>
        <div className={styles.emptyTitle}>Student not found</div>
        <div className={styles.emptyDesc}>
          <Link href={`/teacher/students${q}`} style={{ color: 'var(--hp-primary)' }}>← Back to student list</Link>
        </div>
      </div>
    );
  }

  // ---------- Parallel Data Fetching (all by student ID + subject) ----------

  const [
    writtenResponses,
    artifacts,
    outcomeMastery,
    unitProgress,
    lastEvent,
    submissions,
    notes,
  ] = await Promise.all([
    getStudentWrittenResponses(id, teacherId, ctx),
    getStudentArtifacts(id, teacherId, ctx),
    getStudentOutcomeMastery(id, teacherId, ctx),
    getStudentUnitProgress(id, teacherId, ctx),
    getLastAcademicEvent(id, teacherId, ctx),
    getStudentSubmissions(id, teacherId, ctx),
    getStudentNotes(id, teacherId),
  ]);

  // Fetch skill mastery summary for the mastery state grid
  let skillMastery = { masteredCount: 0, developingCount: 0, reviewDueCount: 0, needsSupportCount: 0, totalSkills: 0 };
  if (!id.startsWith('demo-')) {
    try {
      const ds = await prisma.studentDashboardSummary.findUnique({
        where: { studentId: id },
      });
      if (ds) {
        skillMastery = {
          masteredCount: ds.masteredCount,
          developingCount: ds.developingCount,
          reviewDueCount: ds.reviewDueCount,
          needsSupportCount: ds.needsSupportCount,
          totalSkills: ds.masteredCount + ds.developingCount + ds.reviewDueCount + ds.needsSupportCount,
        };
      }
    } catch { /* model may not exist */ }
  } else {
    // Demo data
    const demoProfiles = [
      { m: 5, d: 1, r: 0, ns: 0 }, { m: 3, d: 2, r: 1, ns: 0 },
      { m: 2, d: 2, r: 1, ns: 1 }, { m: 1, d: 1, r: 1, ns: 2 },
      { m: 6, d: 0, r: 0, ns: 0 }, { m: 3, d: 1, r: 1, ns: 1 },
      { m: 4, d: 2, r: 0, ns: 0 }, { m: 1, d: 2, r: 0, ns: 0 },
    ];
    const idx = parseInt(id.replace('demo-', ''), 10) || 0;
    const p = demoProfiles[idx % demoProfiles.length];
    skillMastery = { masteredCount: p.m, developingCount: p.d, reviewDueCount: p.r, needsSupportCount: p.ns, totalSkills: p.m + p.d + p.r + p.ns };
  }

  // Fetch unit overrides for this student
  let unitOverrideRecords: { unitId: string; overrideState: string; note: string | null }[] = [];
  if (!id.startsWith('demo-') || !isDemoMode()) {
    try {
      unitOverrideRecords = await (prisma as any).studentUnitAccess.findMany({
        where: { studentId: id },
        select: { unitId: true, overrideState: true, note: true },
      });
    } catch {
      // Model may not exist yet after migration
    }
  }
  const overrideMap = new Map(unitOverrideRecords.map((o) => [o.unitId, { state: o.overrideState, note: o.note }]));

  // Build unitOverrides array for StudentActions
  const unitOverridesForActions = unitProgress.map((u) => {
    const ov = overrideMap.get(u.unitId);
    return {
      unitId: u.unitId,
      unitTitle: u.unitTitle,
      unitIcon: u.unitIcon,
      unitOrder: 0,
      currentOverride: ov?.state && ov.state !== 'NONE' ? ov.state : null,
      currentNote: ov?.note || null,
      completionPct: u.completionPct,
    };
  });

  // ---------- Derived Values ----------

  const aStyle = getAcademicPacingStyle(student.pacing.academicStatus);
  const eStyle = getEngagementStyle(student.pacing.engagementStatus);
  const initials = getInitials(student.name);
  const enrolledFormatted = formatDate(student.enrolledAt);

  const pendingReview = writtenResponses.filter((r) => !r.reviewed).length
    + artifacts.filter((a) => !a.reviewed).length;

  // Mastery summary
  const totalOutcomes = outcomeMastery.length;
  const meetingOrExceeding = outcomeMastery.filter((o) =>
    o.masteryLevel === 'MEETING' || o.masteryLevel === 'EXCEEDING'
  ).length;
  const weakOutcomes = outcomeMastery.filter((o) =>
    o.masteryLevel === 'EMERGING' || o.masteryLevel === 'NOT_YET_ASSESSED'
  );

  // Intervention reasons — natural teacher-friendly language
  const interventionReasons: string[] = [];
  if (student.pacing.academicStatus === 'SIGNIFICANTLY_BEHIND') {
    interventionReasons.push(`Currently ${Math.abs(student.pacing.daysBehindOrAhead)} days behind expected pace`);
  } else if (student.pacing.academicStatus === 'SLIGHTLY_BEHIND') {
    interventionReasons.push(`Slightly behind — ${Math.abs(student.pacing.daysBehindOrAhead)} days behind expected pace`);
  }
  if (student.pacing.engagementStatus === 'STALLED') {
    interventionReasons.push(`No academic activity in ${student.pacing.daysSinceActive} days`);
  }
  if (student.avgScore !== null && student.avgScore < 70) {
    interventionReasons.push(`Average score is currently ${Math.round(student.avgScore)}%`);
  }
  if (weakOutcomes.length > 0) {
    interventionReasons.push(`${weakOutcomes.length} outcome${weakOutcomes.length !== 1 ? 's' : ''} need${weakOutcomes.length === 1 ? 's' : ''} stronger evidence`);
  }

  return (
    <>
      <Link href="/teacher/students" className={styles.backLink} style={{ display: 'inline-block', marginBottom: 20, fontSize: '0.88rem' }}>
        ← Back to students
      </Link>

      {/* ===== 1. STUDENT HEADER ===== */}
      <div className={styles.studentHeader}>
        <div className={styles.studentHeaderAvatar}>{initials}</div>
        <div className={styles.studentHeaderInfo}>
          <h2 className={styles.studentHeaderName}>{student.name}</h2>
          <div className={styles.studentHeaderMeta}>
            Grade {student.gradeLevel || '—'} · Enrolled {enrolledFormatted} · {student.currentUnit || 'No unit'} · {student.currentLesson || 'No lesson'}
          </div>
          <div className={styles.badgeStack} style={{ marginTop: 8 }}>
            <span className={styles.pacingBadge} style={{ background: aStyle.bg, color: aStyle.color }}>
              {aStyle.icon} {student.pacing.academicLabel}
            </span>
            <span className={styles.pacingBadge} style={{ background: eStyle.bg, color: eStyle.color }}>
              {eStyle.icon} {student.pacing.engagementStatus === 'STALLED' ? 'Stalled' : 'Active'}
            </span>
            {pendingReview > 0 && (
              <span className={styles.pacingBadge} style={{ background: '#fef3c7', color: '#d97706' }}>
                📝 {pendingReview} pending review
              </span>
            )}
          </div>
        </div>
        <div className={styles.studentHeaderActions}>
          <Link href={`/teacher/submissions${q}`} className={styles.smallBtn} style={{ textDecoration: 'none' }}>
            Review Work
          </Link>
        </div>
      </div>

      {/* ===== 2. PACING & ENGAGEMENT SUMMARY ===== */}
      <div className={styles.dashCard} style={{ marginBottom: 24 }}>
        <h3 className={styles.cardTitle}>📐 Pacing & Engagement</h3>
        <div className={styles.pacingDetailGrid}>
          <div className={styles.pacingDetailItem}>
            <div className={styles.pacingDetailLabel}>Actual Progress</div>
            <div className={styles.pacingDetailValue}>{Math.round(student.pacing.actualProgress)}%</div>
            <div className={styles.progressBarWrap}>
              <div className={styles.progressBarFill} style={{
                width: `${Math.min(100, student.pacing.actualProgress)}%`,
                background: aStyle.color,
              }} />
              <div className={styles.progressBarExpected} style={{ left: `${Math.min(100, student.pacing.expectedProgress)}%` }} />
            </div>
          </div>
          <div className={styles.pacingDetailItem}>
            <div className={styles.pacingDetailLabel}>Expected Progress</div>
            <div className={styles.pacingDetailValue}>{Math.round(student.pacing.expectedProgress)}%</div>
          </div>
          <div className={styles.pacingDetailItem}>
            <div className={styles.pacingDetailLabel}>Pacing Offset</div>
            <div className={styles.pacingDetailValue} style={{ color: student.pacing.daysBehindOrAhead >= 0 ? '#059669' : '#dc2626' }}>
              {formatDaysOffset(student.pacing.daysBehindOrAhead, student.pacing.isGracePeriod)}
            </div>
          </div>
          <div className={styles.pacingDetailItem}>
            <div className={styles.pacingDetailLabel}>Days Since Active</div>
            <div className={styles.pacingDetailValue} style={{ fontSize: '1rem' }}>
              {student.pacing.daysSinceActive !== null ? `${student.pacing.daysSinceActive}d` : '—'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--hp-text3)', marginTop: 4 }}>
              {getEngagementLabel(student.pacing.engagementStatus, student.pacing.daysSinceActive)}
            </div>
          </div>

          {/* Status explanation */}
          <div className={styles.pacingDetailItem} style={{ gridColumn: '1 / -1' }}>
            <div className={styles.pacingDetailLabel}>Status</div>
            <div style={{ fontSize: '0.92rem', color: 'var(--hp-text2)', lineHeight: 1.6 }}>
              {student.pacing.pacingSummary}
              {student.pacing.isGracePeriod && ' — Pacing alerts are paused during the onboarding period.'}
              {student.pacing.engagementStatus === 'STALLED' && ` · ${student.pacing.engagementLabel}`}
            </div>
          </div>

          {/* Last Academic Event — exact details */}
          {lastEvent && (
            <div className={styles.pacingDetailItem} style={{ gridColumn: '1 / -1' }}>
              <div className={styles.pacingDetailLabel}>Last Academic Activity</div>
              <div style={{ fontSize: '0.92rem', color: 'var(--hp-text)', fontWeight: 600 }}>
                {lastEvent.title}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--hp-text3)' }}>
                {lastEvent.type} — {formatShortDate(lastEvent.date)}
              </div>
            </div>
          )}
        </div>

        {/* Mastery at a glance */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--hp-border)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <MasteryGlanceItem label="Outcomes Assessed" value={`${meetingOrExceeding + outcomeMastery.filter((o) => o.masteryLevel === 'APPROACHING').length} / ${totalOutcomes}`} />
          <MasteryGlanceItem label="Meeting or Exceeding" value={String(meetingOrExceeding)} color="#059669" />
          <MasteryGlanceItem label="Need Stronger Evidence" value={String(weakOutcomes.length)} color="#d97706" />
          <MasteryGlanceItem label="Pending Teacher Review" value={String(pendingReview)} color="#7c3aed" />
        </div>
      </div>

      {/* ===== SKILL MASTERY STATE GRID ===== */}
      {skillMastery.totalSkills > 0 && (
        <div className={styles.dashCard} style={{ marginBottom: 24 }}>
          <h3 className={styles.cardTitle}>🧠 Skill Mastery</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>{skillMastery.masteredCount}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#047857', marginTop: 2 }}>Mastered</div>
            </div>
            <div style={{ background: '#eff6ff', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb' }}>{skillMastery.developingCount}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1d4ed8', marginTop: 2 }}>Developing</div>
            </div>
            <div style={{ background: '#fffbeb', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706' }}>{skillMastery.reviewDueCount}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#b45309', marginTop: 2 }}>Review Due</div>
            </div>
            <div style={{ background: '#fef2f2', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626' }}>{skillMastery.needsSupportCount}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#b91c1c', marginTop: 2 }}>Needs Support</div>
            </div>
          </div>
          <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: '#f1f5f9' }}>
            {(() => {
              const total = skillMastery.totalSkills;
              const pct = (n: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : '0%';
              return (
                <>
                  <div style={{ width: pct(skillMastery.masteredCount), background: '#059669', height: '100%' }} />
                  <div style={{ width: pct(skillMastery.developingCount), background: '#3b82f6', height: '100%' }} />
                  <div style={{ width: pct(skillMastery.reviewDueCount), background: '#f59e0b', height: '100%' }} />
                  <div style={{ width: pct(skillMastery.needsSupportCount), background: '#ef4444', height: '100%' }} />
                </>
              );
            })()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.74rem', color: '#64748b' }}>
            <span>{skillMastery.masteredCount} of {skillMastery.totalSkills} skills mastered</span>
            <span>{Math.round((skillMastery.masteredCount / Math.max(skillMastery.totalSkills, 1)) * 100)}% mastery</span>
          </div>
        </div>
      )}

      <div className={styles.splitLayout}>
        {/* ===== LEFT COLUMN ===== */}
        <div>
          {/* ===== 5. WRITTEN RESPONSES ===== */}
          <div className={styles.dashCard} style={{ marginBottom: 24 }}>
            <h3 className={styles.cardTitle}>📝 Written Responses</h3>
            {writtenResponses.length === 0 ? (
              <EmptySection icon="📝" text="No written responses recorded yet." />
            ) : (
              writtenResponses.map((r) => (
                <Link
                  key={r.id}
                  href={`/teacher/submissions/${r.id}${q}`}
                  className={styles.evidenceCardClickable}
                >
                  <div className={styles.evidenceCard}>
                    <div className={styles.evidenceHeader}>
                      <div>
                        <div className={styles.evidenceTitle}>{r.title}</div>
                        <div className={styles.evidenceMeta}>
                          <span className={styles.evidenceTypeBadge}>{getSubmissionTypeLabel(r.submissionType)}</span>
                          {r.unitLesson} · {formatShortDate(r.submittedAt)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {r.score !== null && r.maxScore !== null && (
                          <span className={styles.evidenceScore}>{r.score}/{r.maxScore}</span>
                        )}
                        <ReviewBadge reviewed={r.reviewed} />
                      </div>
                    </div>
                    <div className={styles.evidencePreview}>{r.preview}</div>
                    {r.teacherFeedback && (
                      <div className={styles.teacherFeedback}>
                        <strong>Teacher:</strong> {r.teacherFeedback}
                      </div>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* ===== SUBMITTED ARTIFACTS ===== */}
          <div className={styles.dashCard} style={{ marginBottom: 24 }}>
            <h3 className={styles.cardTitle}>📎 Submitted Artifacts</h3>
            {artifacts.length === 0 ? (
              <EmptySection icon="📎" text="No artifacts uploaded yet." />
            ) : (
              artifacts.map((a) => (
                <Link
                  key={a.id}
                  href={`/teacher/submissions/${a.id}${q}`}
                  className={styles.evidenceCardClickable}
                >
                  <div className={styles.artifactItem}>
                    <div className={styles.artifactIcon}>
                      {a.submissionType === 'IMAGE_ARTIFACT' ? '🖼️'
                        : a.submissionType === 'UPLOADED_WORKSHEET' ? '📄' : '📁'}
                    </div>
                    <div className={styles.artifactInfo}>
                      <div className={styles.artifactName}>{a.title}</div>
                      <div className={styles.artifactMeta}>
                        {getSubmissionTypeLabel(a.submissionType)} · {a.fileName} · {a.unitLesson} · {formatShortDate(a.submittedAt)}
                      </div>
                    </div>
                    <ReviewBadge reviewed={a.reviewed} />
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* ===== 3. PROGRESS BY UNIT ===== */}
          <div className={styles.dashCard}>
            <h3 className={styles.cardTitle}>📚 Progress by Unit</h3>
            {unitProgress.map((u) => {
              const color = u.completionPct >= 70 ? '#059669' : u.completionPct >= 40 ? '#d97706' : '#dc2626';
              const ov = overrideMap.get(u.unitId);
              const hasOverride = ov && ov.state !== 'NONE';
              return (
                <div key={u.unitId} className={styles.unitProgressItem}>
                  <div className={styles.unitProgressHeader}>
                    <span className={styles.unitProgressTitle}>
                      {u.unitIcon} {u.unitTitle}
                      {hasOverride && (
                        <span
                          className={styles.pacingBadge}
                          style={{
                            marginLeft: 8,
                            fontSize: '0.7rem',
                            background: ov.state === 'COMPLETED' || ov.state === 'EXEMPT' ? '#d1fae5' : '#dbeafe',
                            color: ov.state === 'COMPLETED' || ov.state === 'EXEMPT' ? '#059669' : '#2563eb',
                          }}
                        >
                          {ov.state === 'UNLOCKED' ? '🔓 Unlocked' : ov.state === 'COMPLETED' ? '✅ Completed (override)' : ov.state === 'EXEMPT' ? '⏭️ Exempt' : ov.state}
                        </span>
                      )}
                    </span>
                    <span className={styles.unitProgressPct}>
                      {u.completedLessons}/{u.totalLessons} lessons · {u.completionPct}%
                      {u.avgScore !== null && <span style={{ color: '#64748b', marginLeft: 8 }}>({u.avgScore}% avg)</span>}
                    </span>
                  </div>
                  <div className={styles.progressBarWrap}>
                    <div className={styles.progressBarFill} style={{ width: `${Math.min(100, u.completionPct)}%`, background: color }} />
                  </div>
                  {hasOverride && ov.note && (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', marginTop: 2 }}>
                      Note: {ov.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== RIGHT COLUMN ===== */}
        <div>
          {/* Intervention Context */}
          {interventionReasons.length > 0 && (
            <div className={styles.dashCard} style={{ marginBottom: 24, borderLeft: '4px solid #dc2626' }}>
              <h3 className={styles.cardTitle}>🚨 Why This Student Needs Attention</h3>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {interventionReasons.map((reason, i) => (
                  <li key={i} style={{ fontSize: '0.9rem', color: 'var(--hp-text2)', lineHeight: 2 }}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ===== 6. OUTCOMES MASTERY ===== */}
          <div className={styles.dashCard} style={{ marginBottom: 24 }} id="outcomes-mastery">
            <h3 className={styles.cardTitle}>🎯 Outcomes Mastery</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Outcome</th>
                    <th>Mastery</th>
                    <th>Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {outcomeMastery.map((o) => {
                    const mStyle = getMasteryStyle(o.masteryLevel);
                    return (
                      <tr key={o.outcomeId}>
                        <td>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--hp-primary)' }}>{o.outcomeCode}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--hp-text3)', lineHeight: 1.4, maxWidth: 220 }}>{o.outcomeDescription}</div>
                        </td>
                        <td>
                          <span className={styles.pacingBadge} style={{ background: mStyle.bg, color: mStyle.color }}>
                            {mStyle.label}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.82rem' }}>
                            {o.evidenceCount > 0 ? (
                              <>
                                <div>{o.evidenceCount} piece{o.evidenceCount !== 1 ? 's' : ''}</div>
                                {o.latestEvidence && (
                                  <div style={{ color: 'var(--hp-text3)', fontSize: '0.75rem' }}>Latest: {o.latestEvidence}</div>
                                )}
                                {o.latestDate && (
                                  <div style={{ color: 'var(--hp-text3)', fontSize: '0.72rem' }}>{formatShortDate(o.latestDate)}</div>
                                )}
                              </>
                            ) : (
                              <span style={{ color: 'var(--hp-text3)' }}>No evidence</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== 4. RECENT SUBMISSIONS ===== */}
          <div className={styles.dashCard} style={{ marginBottom: 24 }}>
            <h3 className={styles.cardTitle}>📋 Recent Submissions</h3>
            {submissions.length === 0 ? (
              <EmptySection icon="📋" text="No submissions recorded yet." />
            ) : (
              submissions.map((sub) => {
                const typeLabel = sub.activityType.charAt(0) + sub.activityType.slice(1).toLowerCase();
                return (
                  <Link
                    key={sub.id}
                    href={`/teacher/submissions/${sub.id}${q}`}
                    className={styles.evidenceCardClickable}
                  >
                    <div className={styles.submissionItem}>
                      <div className={styles.submissionInfo}>
                        <div className={styles.submissionStudent}>{sub.activityTitle}</div>
                        <div className={styles.submissionActivity}>
                          {typeLabel} · {formatShortDate(sub.submittedAt)}
                        </div>
                      </div>
                      {sub.score !== null && sub.maxScore !== null && (
                        <div className={styles.submissionScore}>{sub.score}/{sub.maxScore}</div>
                      )}
                      <ReviewBadge reviewed={sub.reviewed} />
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* ===== 7. TEACHER NOTES ===== */}
          <div className={styles.dashCard} style={{ marginBottom: 24 }}>
            <h3 className={styles.cardTitle}>📋 Teacher Notes</h3>
            {notes.length === 0 ? (
              <EmptySection icon="📋" text="No notes for this student yet." />
            ) : (
              notes.map((note) => (
                <div key={note.id} className={styles.submissionItem}>
                  <div className={styles.submissionInfo}>
                    <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>{note.content}</div>
                  </div>
                  <span className={styles.pacingBadge} style={{ background: '#f1f5f9', color: '#475569' }}>
                    {note.tag}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Quick Actions — Real workflows */}
          <div className={styles.dashCard}>
            <h3 className={styles.cardTitle}>⚡ Quick Actions</h3>
            <StudentActions
              studentId={student.id}
              studentName={student.name}
              contextQuery={q}
              unitOverrides={unitOverridesForActions}
            />
          </div>
        </div>
      </div>
    </>
  );
}

// ---------- Reusable Sub-Components ----------

function ReviewBadge({ reviewed }: { reviewed: boolean }) {
  return (
    <span className={`${styles.reviewBadge} ${reviewed ? styles.reviewDone : styles.reviewPending}`}>
      {reviewed ? '✓ Reviewed' : 'Needs Review'}
    </span>
  );
}

function EmptySection({ icon, text }: { icon: string; text: string }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>{icon}</div>
      <div className={styles.emptyDesc}>{text}</div>
    </div>
  );
}

function MasteryGlanceItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <span style={{ fontSize: '0.75rem', color: 'var(--hp-text3)', textTransform: 'uppercase' as const, fontWeight: 600 }}>{label}</span>
      <br />
      <strong style={{ color: color || 'var(--hp-text)' }}>{value}</strong>
    </div>
  );
}

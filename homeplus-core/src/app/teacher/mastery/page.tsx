// ============================================
// Teacher Mastery Board — Home Plus LMS (Phase 5)
// ============================================
// Class mastery overview with skill breakdown grid
// and per-student mastery summaries.

import Link from 'next/link';
import styles from '../teacher.module.css';
import { getStudentsWithPacing, getClassMasteryOverview } from '@/lib/teacher-data';
import { getTeacherId } from '@/lib/teacher-auth';
import { resolveContext, buildContextQuery } from '@/lib/teacher-context';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MasteryBoard({ searchParams }: PageProps) {
  const params = await searchParams;
  const teacherId = await getTeacherId();
  const ctx = await resolveContext(params, teacherId);
  const q = buildContextQuery(ctx);

  const students = await getStudentsWithPacing(teacherId, ctx);
  const mastery = await getClassMasteryOverview(students, teacherId, ctx);

  return (
    <>
      {/* Mastery Metrics */}
      <div className={styles.metricsGrid}>
        <MetricCard icon="🧠" label="Avg Mastery" value={`${mastery.avgMasteryPercent}%`} bg="#d1fae5" />
        <MetricCard icon="⭐" label="Fully Mastered" value={mastery.studentsFullyMastered} bg="#fef3c7" />
        <MetricCard icon="🚨" label="Need Support" value={mastery.studentsWithSupport} bg="#fee2e2" />
        <MetricCard icon="🔄" label="Review Due" value={mastery.studentsWithReviewDue} bg="#fef3c7" />
      </div>

      {/* Skill Breakdown Grid */}
      <div className={styles.dashCard} style={{ marginBottom: 24 }}>
        <h3 className={styles.cardTitle}>📊 Skill Mastery — {ctx.subjectName}</h3>
        {mastery.skillBreakdown.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📚</div>
            <div className={styles.emptyTitle}>No skills mapped yet</div>
            <div className={styles.emptyDesc}>Skills will appear here as students complete lessons.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Skill</th>
                  <th style={{ textAlign: 'center' }}>Mastery Distribution</th>
                  <th style={{ textAlign: 'center', color: '#059669' }}>✅ Mastered</th>
                  <th style={{ textAlign: 'center', color: '#2563eb' }}>📈 Developing</th>
                  <th style={{ textAlign: 'center', color: '#d97706' }}>🔄 Review</th>
                  <th style={{ textAlign: 'center', color: '#dc2626' }}>🚨 Support</th>
                  <th style={{ textAlign: 'center', color: '#94a3b8' }}>— Not Started</th>
                </tr>
              </thead>
              <tbody>
                {mastery.skillBreakdown.map((skill) => {
                  const total = skill.totalStudents;
                  const pct = (n: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : '0%';
                  return (
                    <tr key={skill.skillId}>
                      <td>
                        <div style={{ maxWidth: 260 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1a2137' }}>{skill.skillTitle}</div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{skill.skillCode}</div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: '#f1f5f9', minWidth: 120 }}>
                          <div style={{ width: pct(skill.masteredCount), background: '#059669', height: '100%' }} />
                          <div style={{ width: pct(skill.developingCount), background: '#3b82f6', height: '100%' }} />
                          <div style={{ width: pct(skill.reviewDueCount), background: '#f59e0b', height: '100%' }} />
                          <div style={{ width: pct(skill.needsSupportCount), background: '#ef4444', height: '100%' }} />
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#059669' }}>{skill.masteredCount}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#2563eb' }}>{skill.developingCount}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#d97706' }}>{skill.reviewDueCount}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#dc2626' }}>{skill.needsSupportCount}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#94a3b8' }}>{skill.notStartedCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Per-Student Mastery */}
      <div className={styles.dashCard}>
        <h3 className={styles.cardTitle}>👥 Student Mastery</h3>
        {mastery.studentSummaries.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>👥</div>
            <div className={styles.emptyTitle}>No students enrolled</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th style={{ textAlign: 'center' }}>Mastery %</th>
                  <th style={{ textAlign: 'center' }}>Health Bar</th>
                  <th style={{ textAlign: 'center', color: '#059669' }}>Mastered</th>
                  <th style={{ textAlign: 'center', color: '#2563eb' }}>Developing</th>
                  <th style={{ textAlign: 'center', color: '#d97706' }}>Review</th>
                  <th style={{ textAlign: 'center', color: '#dc2626' }}>Support</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {mastery.studentSummaries
                  .sort((a, b) => a.masteryPercent - b.masteryPercent) // weakest first
                  .map((s) => {
                    const total = s.masteredCount + s.developingCount + s.reviewDueCount + s.needsSupportCount;
                    const pct = (n: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : '0%';
                    return (
                      <tr key={s.studentId} className={styles.clickableRow}>
                        <td>
                          <Link href={`/teacher/students/${s.studentId}${q}`} className={styles.rowLink}>
                            <div className={styles.studentName}>
                              <div className={styles.tableAvatar}>
                                {s.studentName.split(' ').map((n) => n[0]).join('')}
                              </div>
                              {s.studentName}
                            </div>
                          </Link>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: s.masteryPercent >= 70 ? '#059669' : s.masteryPercent >= 40 ? '#d97706' : '#dc2626' }}>
                            {s.masteryPercent}%
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: '#f1f5f9', minWidth: 100 }}>
                            <div style={{ width: pct(s.masteredCount), background: '#059669', height: '100%' }} />
                            <div style={{ width: pct(s.developingCount), background: '#3b82f6', height: '100%' }} />
                            <div style={{ width: pct(s.reviewDueCount), background: '#f59e0b', height: '100%' }} />
                            <div style={{ width: pct(s.needsSupportCount), background: '#ef4444', height: '100%' }} />
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#059669' }}>{s.masteredCount}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#2563eb' }}>{s.developingCount}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#d97706' }}>{s.reviewDueCount}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#dc2626' }}>{s.needsSupportCount}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {s.needsSupportCount > 0 && (
                              <span className={styles.pacingBadge} style={{ background: '#fee2e2', color: '#dc2626' }}>
                                🚨 {s.needsSupportCount}
                              </span>
                            )}
                            {s.reviewDueCount > 0 && (
                              <span className={styles.pacingBadge} style={{ background: '#fef3c7', color: '#d97706' }}>
                                🔄 {s.reviewDueCount}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function MetricCard({ icon, label, value, bg }: { icon: string; label: string; value: string | number; bg: string }) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricIcon} style={{ background: bg }}>{icon}</div>
      <div className={styles.metricInfo}>
        <div className={styles.metricLabel}>{label}</div>
        <div className={styles.metricValue}>{value}</div>
      </div>
    </div>
  );
}

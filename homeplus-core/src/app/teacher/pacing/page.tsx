import Link from 'next/link';
import styles from '../teacher.module.css';
import { getStudentsWithPacing, getStudentsByPriority } from '@/lib/teacher-data';
import { getAcademicPacingStyle, getEngagementStyle, formatDaysOffset, formatDaysSinceActive } from '@/lib/pacing';
import { getTeacherId } from '@/lib/teacher-auth';
import { resolveContext, buildContextQuery } from '@/lib/teacher-context';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PacingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const teacherId = await getTeacherId();
  const ctx = await resolveContext(params, teacherId);
  const q = buildContextQuery(ctx);

  const students = await getStudentsWithPacing(teacherId, ctx);
  const sorted = getStudentsByPriority(students);

  const counts = {
    onPace: students.filter((s) => s.pacing.academicStatus === 'ON_PACE').length,
    behind: students.filter((s) => s.pacing.academicStatus === 'SLIGHTLY_BEHIND' || s.pacing.academicStatus === 'SIGNIFICANTLY_BEHIND').length,
    ahead: students.filter((s) => s.pacing.academicStatus === 'AHEAD').length,
    stalled: students.filter((s) => s.pacing.engagementStatus === 'STALLED').length,
    onboarding: students.filter((s) => s.pacing.academicStatus === 'NEWLY_ENROLLED').length,
    complete: students.filter((s) => s.pacing.academicStatus === 'COMPLETE').length,
  };

  return (
    <>
      {/* Pacing Summary Bar */}
      <div className={styles.pacingSummary}>
        <PacingStat icon="✅" label="On Pace" value={counts.onPace} color="#059669" />
        <PacingStat icon="⚠️" label="Behind" value={counts.behind} color="#d97706" />
        <PacingStat icon="🚀" label="Ahead" value={counts.ahead} color="#2563eb" />
        <PacingStat icon="⏸️" label="Stalled" value={counts.stalled} color="#6b7280" />
        <PacingStat icon="🆕" label="Onboarding" value={counts.onboarding} color="#7c3aed" />
        <PacingStat icon="🎉" label="Complete" value={counts.complete} color="#059669" />
      </div>

      {/* Pacing Table */}
      <div className={styles.dashCard}>
        <h3 className={styles.cardTitle}>⏱️ {ctx.subjectName} Pacing Detail</h3>

        <div className={styles.pacingLegend}>
          <span className={styles.legendItem}>
            <span className={styles.legendBar} style={{ background: '#059669' }} /> Actual progress
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendMarker} /> Expected progress
          </span>
        </div>

        {students.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📊</div>
            <div className={styles.emptyTitle}>No pacing data yet</div>
            <div className={styles.emptyDesc}>Pacing data will appear once students are enrolled and begin working.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Academic Pacing</th>
                  <th>Engagement</th>
                  <th>Progress</th>
                  <th>Expected</th>
                  <th>Pacing Offset</th>
                  <th>Days Since Active</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => {
                  const aStyle = getAcademicPacingStyle(s.pacing.academicStatus);
                  const eStyle = getEngagementStyle(s.pacing.engagementStatus);

                  return (
                    <tr key={s.id} className={styles.clickableRow}>
                      <td>
                        <Link href={`/teacher/students/${s.id}${q}`} className={styles.rowLink}>
                          <div className={styles.studentName}>
                            <div className={styles.tableAvatar}>
                              {s.name.split(' ').map((n) => n[0]).join('')}
                            </div>
                            {s.name}
                          </div>
                        </Link>
                      </td>
                      <td>
                        <Link href={`/teacher/students/${s.id}${q}`} className={styles.rowLink}>
                          <span className={styles.pacingBadge} style={{ background: aStyle.bg, color: aStyle.color }}>
                            {aStyle.icon} {s.pacing.academicLabel}
                          </span>
                        </Link>
                      </td>
                      <td>
                        <Link href={`/teacher/students/${s.id}${q}`} className={styles.rowLink}>
                          <span className={styles.pacingBadge} style={{ background: eStyle.bg, color: eStyle.color }}>
                            {eStyle.icon} {s.pacing.engagementStatus === 'STALLED' ? 'Stalled' : 'Active'}
                          </span>
                        </Link>
                      </td>
                      <td>
                        <Link href={`/teacher/students/${s.id}${q}`} className={styles.rowLink}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className={styles.progressBarWrap} style={{ width: 100 }}>
                              <div className={styles.progressBarFill} style={{ width: `${Math.min(100, s.pacing.actualProgress)}%`, background: aStyle.color }} />
                              <div className={styles.progressBarExpected} style={{ left: `${Math.min(100, s.pacing.expectedProgress)}%` }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>
                              {Math.round(s.pacing.actualProgress)}%
                            </span>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <Link href={`/teacher/students/${s.id}${q}`} className={styles.rowLink}>
                          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                            {Math.round(s.pacing.expectedProgress)}%
                          </span>
                        </Link>
                      </td>
                      <td>
                        <Link href={`/teacher/students/${s.id}${q}`} className={styles.rowLink}>
                          <span style={{
                            fontWeight: 700,
                            color: s.pacing.isGracePeriod ? '#7c3aed' : s.pacing.daysBehindOrAhead >= 0 ? '#059669' : '#dc2626',
                            fontSize: '0.88rem',
                          }}>
                            {formatDaysOffset(s.pacing.daysBehindOrAhead, s.pacing.isGracePeriod)}
                          </span>
                        </Link>
                      </td>
                      <td>
                        <Link href={`/teacher/students/${s.id}${q}`} className={styles.rowLink}>
                          <span style={{ fontSize: '0.82rem', color: s.pacing.engagementStatus === 'STALLED' ? '#dc2626' : '#64748b' }}>
                            {s.pacing.daysSinceActive !== null ? `${s.pacing.daysSinceActive}d` : '—'}
                          </span>
                        </Link>
                      </td>
                      <td>
                        <Link href={`/teacher/students/${s.id}${q}`} className={styles.rowLink}>
                          <span style={{ fontSize: '0.82rem' }}>{s.currentUnit || '—'}</span>
                        </Link>
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

function PacingStat({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className={styles.pacingStat}>
      <span style={{ fontSize: '1.2rem' }}>{icon}</span>
      <div>
        <div className={styles.pacingStatValue} style={{ color }}>{value}</div>
        <div className={styles.pacingStatLabel}>{label}</div>
      </div>
    </div>
  );
}

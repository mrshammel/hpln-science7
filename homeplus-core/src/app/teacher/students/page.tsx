import Link from 'next/link';
import styles from '../teacher.module.css';
import { getStudentsWithPacing, getClassMasteryOverview } from '@/lib/teacher-data';
import { getAcademicPacingStyle, getEngagementStyle } from '@/lib/pacing';
import { getTeacherId } from '@/lib/teacher-auth';
import { resolveContext, buildContextQuery } from '@/lib/teacher-context';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StudentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const teacherId = await getTeacherId();
  const ctx = await resolveContext(params, teacherId);
  const q = buildContextQuery(ctx);

  const students = await getStudentsWithPacing(teacherId, ctx);
  const classMastery = await getClassMasteryOverview(students, teacherId, ctx);
  const masteryMap = new Map(classMastery.studentSummaries.map((s) => [s.studentId, s]));

  return (
    <>
      <div className={styles.tableControls}>
        <input type="text" className={styles.searchInput} placeholder="🔍 Search students..." />
        <select className={styles.filterSelect}>
          <option value="">All Pacing</option>
          <option value="ON_PACE">On Pace</option>
          <option value="SLIGHTLY_BEHIND">Slightly Behind</option>
          <option value="SIGNIFICANTLY_BEHIND">Significantly Behind</option>
          <option value="AHEAD">Ahead</option>
          <option value="NEWLY_ENROLLED">Newly Enrolled</option>
          <option value="COMPLETE">Complete</option>
        </select>
        <select className={styles.filterSelect}>
          <option value="">All Engagement</option>
          <option value="ACTIVE">Active</option>
          <option value="STALLED">Stalled</option>
        </select>
      </div>

      <div className={styles.dashCard}>
        {students.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>👥</div>
            <div className={styles.emptyTitle}>No students enrolled yet</div>
            <div className={styles.emptyDesc}>Students will appear here once they sign in and are assigned to your class.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Grade</th>
                  <th>Current Unit</th>
                  <th>Progress</th>
                  <th>{ctx.subjectName} Avg</th>
                  <th>Mastery</th>
                  <th>Days Since Active</th>
                  <th>Pacing</th>
                  <th>Engagement</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
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
                          <span style={{ fontSize: '0.85rem' }}>{s.gradeLevel || '—'}</span>
                        </Link>
                      </td>
                      <td>
                        <Link href={`/teacher/students/${s.id}${q}`} className={styles.rowLink}>
                          <span style={{ fontSize: '0.85rem' }}>{s.currentUnit || '—'}</span>
                        </Link>
                      </td>
                      <td>
                        <Link href={`/teacher/students/${s.id}${q}`} className={styles.rowLink}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className={styles.progressBarWrap} style={{ width: 80 }}>
                              <div className={styles.progressBarFill} style={{ width: `${Math.min(100, s.pacing.actualProgress)}%`, background: aStyle.color }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                              {Math.round(s.pacing.actualProgress)}%
                            </span>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <Link href={`/teacher/students/${s.id}${q}`} className={styles.rowLink}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            {s.avgScore !== null ? `${Math.round(s.avgScore)}%` : '—'}
                          </span>
                        </Link>
                      </td>
                      <td>
                        <Link href={`/teacher/students/${s.id}${q}`} className={styles.rowLink}>
                          {(() => {
                            const m = masteryMap.get(s.id);
                            if (!m || m.totalSkills === 0) return <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>—</span>;
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: m.masteryPercent >= 70 ? '#059669' : m.masteryPercent >= 40 ? '#d97706' : '#dc2626' }}>
                                  {m.masteryPercent}%
                                </span>
                                {m.needsSupportCount > 0 && (
                                  <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 6px', borderRadius: 6, background: '#fee2e2', color: '#dc2626' }}>
                                    🚨{m.needsSupportCount}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
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

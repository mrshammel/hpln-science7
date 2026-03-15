import styles from '../teacher.module.css';
import { getStudentsWithPacing } from '@/lib/teacher-data';
import { getPacingStyle } from '@/lib/pacing';

export default async function StudentsPage() {
  const students = await getStudentsWithPacing();

  return (
    <>
      {/* Search/Filter Controls */}
      <div className={styles.tableControls}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="🔍 Search students..."
        />
        <select className={styles.filterSelect}>
          <option value="">All Pacing</option>
          <option value="ON_PACE">On Pace</option>
          <option value="BEHIND">Behind</option>
          <option value="AHEAD">Ahead</option>
          <option value="STALLED">Stalled</option>
          <option value="NEWLY_ENROLLED">Newly Enrolled</option>
        </select>
        <select className={styles.filterSelect}>
          <option value="">All Units</option>
          <option value="A">Unit A — Ecosystems</option>
          <option value="B">Unit B — Plants</option>
          <option value="C">Unit C — Heat</option>
          <option value="D">Unit D — Structures</option>
          <option value="E">Unit E — Earth</option>
        </select>
      </div>

      {/* Student Table */}
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
                  <th>Current Lesson</th>
                  <th>Progress</th>
                  <th>Avg Score</th>
                  <th>Last Active</th>
                  <th>Pacing</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const style = getPacingStyle(s.pacing.status);
                  const lastActive = s.lastActivityDate
                    ? new Date(s.lastActivityDate).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
                    : 'No activity';
                  const progressColor = s.pacing.actualProgress >= 70 ? '#059669'
                    : s.pacing.actualProgress >= 40 ? '#d97706' : '#dc2626';

                  return (
                    <tr key={s.id}>
                      <td>
                        <div className={styles.studentName}>
                          <div className={styles.tableAvatar}>
                            {s.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          {s.name}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{s.gradeLevel || '—'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{s.currentUnit || '—'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{s.currentLesson || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className={styles.progressBarWrap} style={{ width: 80 }}>
                            <div
                              className={styles.progressBarFill}
                              style={{
                                width: `${Math.min(100, s.pacing.actualProgress)}%`,
                                background: progressColor,
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                            {Math.round(s.pacing.actualProgress)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {s.avgScore !== null ? `${Math.round(s.avgScore)}%` : '—'}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{lastActive}</td>
                      <td>
                        <span
                          className={styles.pacingBadge}
                          style={{ background: style.bg, color: style.color }}
                        >
                          {style.icon} {s.pacing.label}
                        </span>
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

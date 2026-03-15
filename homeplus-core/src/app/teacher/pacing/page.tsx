import styles from '../teacher.module.css';
import { getStudentsWithPacing, getOverviewMetrics } from '@/lib/teacher-data';
import { getPacingStyle, type PacingStatus } from '@/lib/pacing';

export default async function PacingPage() {
  const students = await getStudentsWithPacing();
  const metrics = await getOverviewMetrics(students);

  // Group by pacing status
  const statusCounts: Record<string, number> = {
    ON_PACE: 0,
    SLIGHTLY_BEHIND: 0,
    SIGNIFICANTLY_BEHIND: 0,
    AHEAD: 0,
    STALLED: 0,
    NEWLY_ENROLLED: 0,
    COMPLETE: 0,
  };
  for (const s of students) {
    statusCounts[s.pacing.status] = (statusCounts[s.pacing.status] || 0) + 1;
  }

  // Sort: most behind first, then stalled, then on pace, ahead last
  const priorityOrder: PacingStatus[] = [
    'SIGNIFICANTLY_BEHIND', 'SLIGHTLY_BEHIND', 'STALLED',
    'NEWLY_ENROLLED', 'ON_PACE', 'AHEAD', 'COMPLETE',
  ];
  const sorted = [...students].sort(
    (a, b) => priorityOrder.indexOf(a.pacing.status) - priorityOrder.indexOf(b.pacing.status)
  );

  return (
    <>
      {/* Pacing Summary Bar */}
      <div className={styles.pacingSummary}>
        <PacingStat icon="✅" label="On Pace" value={statusCounts.ON_PACE} color="#059669" />
        <PacingStat icon="⚠️" label="Behind" value={statusCounts.SLIGHTLY_BEHIND + statusCounts.SIGNIFICANTLY_BEHIND} color="#d97706" />
        <PacingStat icon="🚀" label="Ahead" value={statusCounts.AHEAD} color="#2563eb" />
        <PacingStat icon="⏸️" label="Stalled" value={statusCounts.STALLED} color="#6b7280" />
        <PacingStat icon="🆕" label="Onboarding" value={statusCounts.NEWLY_ENROLLED} color="#7c3aed" />
        <PacingStat icon="🎉" label="Complete" value={statusCounts.COMPLETE} color="#059669" />
      </div>

      {/* Pacing Table */}
      <div className={styles.dashCard}>
        <h3 className={styles.cardTitle}>⏱️ Student Pacing Detail</h3>

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
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Expected</th>
                  <th>Days ±</th>
                  <th>Last Active</th>
                  <th>Current Unit</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => {
                  const style = getPacingStyle(s.pacing.status);
                  const progressColor = s.pacing.actualProgress >= s.pacing.expectedProgress
                    ? '#059669'
                    : s.pacing.actualProgress >= s.pacing.expectedProgress * 0.7
                      ? '#d97706'
                      : '#dc2626';

                  const daysLabel = s.pacing.isGracePeriod
                    ? '—'
                    : s.pacing.daysBehindOrAhead > 0
                      ? `+${s.pacing.daysBehindOrAhead}d`
                      : s.pacing.daysBehindOrAhead < 0
                        ? `${s.pacing.daysBehindOrAhead}d`
                        : '0d';

                  const lastActive = s.lastActivityDate
                    ? new Date(s.lastActivityDate).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
                    : 'No activity';

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
                      <td>
                        <span
                          className={styles.pacingBadge}
                          style={{ background: style.bg, color: style.color }}
                        >
                          {style.icon} {s.pacing.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className={styles.progressBarWrap} style={{ width: 100 }}>
                            <div
                              className={styles.progressBarFill}
                              style={{
                                width: `${Math.min(100, s.pacing.actualProgress)}%`,
                                background: progressColor,
                              }}
                            />
                            <div
                              className={styles.progressBarExpected}
                              style={{ left: `${Math.min(100, s.pacing.expectedProgress)}%` }}
                            />
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>
                            {Math.round(s.pacing.actualProgress)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        {Math.round(s.pacing.expectedProgress)}%
                      </td>
                      <td>
                        <span style={{
                          fontWeight: 700,
                          color: s.pacing.daysBehindOrAhead >= 0 ? '#059669' : '#dc2626',
                          fontSize: '0.88rem',
                        }}>
                          {daysLabel}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        {lastActive}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {s.currentUnit || '—'}
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

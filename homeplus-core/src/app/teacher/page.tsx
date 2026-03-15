import styles from './teacher.module.css';
import { getStudentsWithPacing, getOverviewMetrics, getUnitProgress } from '@/lib/teacher-data';
import { getPacingStyle } from '@/lib/pacing';

export default async function TeacherOverview() {
  const students = await getStudentsWithPacing();
  const metrics = await getOverviewMetrics(students);
  const unitProgress = getUnitProgress(students);

  // Needs attention: significantly behind or stalled
  const needsAttention = students
    .filter((s) => s.pacing.status === 'SIGNIFICANTLY_BEHIND' || s.pacing.status === 'STALLED')
    .slice(0, 5);

  // Students to celebrate: ahead, on pace with high scores, or recently completed
  const celebrate = students
    .filter((s) =>
      s.pacing.status === 'AHEAD' ||
      (s.pacing.status === 'ON_PACE' && s.avgScore !== null && s.avgScore >= 85) ||
      s.pacing.status === 'COMPLETE'
    )
    .slice(0, 4);

  return (
    <>
      {/* Summary Metric Cards */}
      <div className={styles.metricsGrid}>
        <MetricCard icon="✅" label="On Pace" value={metrics.onPace} bg="#d1fae5" />
        <MetricCard icon="⚠️" label="Behind Pace" value={metrics.behind} bg="#fef3c7" />
        <MetricCard icon="🚀" label="Ahead" value={metrics.ahead} bg="#dbeafe" />
        <MetricCard icon="🚨" label="Needs Attention" value={metrics.needsAttention} bg="#fee2e2" />
        <MetricCard icon="📊" label="Avg Progress" value={`${Math.round(metrics.avgProgress)}%`} bg="#ede9fe" />
        <MetricCard icon="🏆" label="Avg Score" value={metrics.avgScore ? `${Math.round(metrics.avgScore)}%` : '—'} bg="#fef3c7" />
        <MetricCard icon="👥" label="Total Students" value={metrics.totalStudents} bg="#e0e7ff" />
        <MetricCard icon="📝" label="Pending Reviews" value={metrics.pendingReviews} bg="#fce7f3" />
      </div>

      {/* Split: Attention + Celebrate/Unit Progress */}
      <div className={styles.splitLayout}>
        {/* Needs Attention */}
        <div className={styles.dashCard}>
          <h3 className={styles.cardTitle}>🚨 Needs Attention</h3>
          {needsAttention.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎉</div>
              <div className={styles.emptyTitle}>All students on track!</div>
              <div className={styles.emptyDesc}>No students need immediate attention today.</div>
            </div>
          ) : (
            needsAttention.map((s) => {
              const style = getPacingStyle(s.pacing.status);
              const reason = s.pacing.status === 'STALLED'
                ? `No activity in ${s.pacing.daysSinceLastActivity} days`
                : `${Math.abs(s.pacing.daysBehindOrAhead)} days behind pace`;
              return (
                <div key={s.id} className={styles.attentionItem}>
                  <div className={styles.attentionAvatar}>
                    {s.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div className={styles.attentionInfo}>
                    <div className={styles.attentionName}>{s.name}</div>
                    <div className={styles.attentionReason}>
                      {s.currentUnit && <>{s.currentUnit} · </>}
                      {reason}
                    </div>
                  </div>
                  <span
                    className={styles.pacingBadge}
                    style={{ background: style.bg, color: style.color }}
                  >
                    {style.icon} {s.pacing.label}
                  </span>
                  <div className={styles.attentionActions}>
                    <button className={styles.smallBtn}>View</button>
                    <button className={styles.smallBtn}>Note</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div>
          {/* Students to Celebrate */}
          <div className={styles.dashCard} style={{ marginBottom: 24 }}>
            <h3 className={styles.cardTitle}>🌟 Students to Celebrate</h3>
            {celebrate.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📈</div>
                <div className={styles.emptyDesc}>Celebrations will appear as students progress.</div>
              </div>
            ) : (
              celebrate.map((s) => {
                let reason = '';
                if (s.pacing.status === 'COMPLETE') reason = 'Completed all lessons!';
                else if (s.pacing.status === 'AHEAD') reason = `${s.pacing.daysBehindOrAhead} days ahead of pace`;
                else if (s.avgScore && s.avgScore >= 85) reason = `Strong performance — ${Math.round(s.avgScore)}% avg`;
                return (
                  <div key={s.id} className={styles.celebrateItem}>
                    <span className={styles.celebrateEmoji}>
                      {s.pacing.status === 'COMPLETE' ? '🎉' : s.pacing.status === 'AHEAD' ? '🚀' : '⭐'}
                    </span>
                    <div className={styles.celebrateInfo}>
                      <div className={styles.celebrateName}>{s.name}</div>
                      <div className={styles.celebrateReason}>{reason}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Unit Progress */}
          <div className={styles.dashCard}>
            <h3 className={styles.cardTitle}>📊 Class Progress by Unit</h3>
            {unitProgress.map((u) => (
              <div key={u.unitId} className={styles.unitProgressItem}>
                <div className={styles.unitProgressHeader}>
                  <span className={styles.unitProgressTitle}>{u.unitIcon} {u.unitTitle}</span>
                  <span className={styles.unitProgressPct}>{Math.round(u.avgCompletion)}%</span>
                </div>
                <div className={styles.progressBarWrap}>
                  <div
                    className={styles.progressBarFill}
                    style={{
                      width: `${Math.min(100, u.avgCompletion)}%`,
                      background: u.avgCompletion >= 70 ? '#059669' : u.avgCompletion >= 40 ? '#d97706' : '#dc2626',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// Reusable metric card component
function MetricCard({ icon, label, value, bg }: { icon: string; label: string; value: string | number; bg: string }) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricIcon} style={{ background: bg }}>
        {icon}
      </div>
      <div className={styles.metricInfo}>
        <div className={styles.metricLabel}>{label}</div>
        <div className={styles.metricValue}>{value}</div>
      </div>
    </div>
  );
}

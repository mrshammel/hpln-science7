import styles from '../student.module.css';
import { getStudentDashboardData } from '@/lib/student-data';

export default async function ProgressPage() {
  const data = await getStudentDashboardData();
  const { enrollments, masterySummary, stats } = data;

  return (
    <>
      <section className={styles.welcomeSection}>
        <h2 className={styles.welcomeTitle}>📊 Progress</h2>
        <p className={styles.welcomeSubtext}>Track your learning progress across all courses</p>
      </section>

      {/* Overall stats */}
      <section className={styles.statRow} style={{ marginBottom: 24 }}>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: '#059669' }}>{stats.overallProgress}%</div>
          <div className={styles.statLabel}>Overall Progress</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: '#2563eb' }}>{stats.lessonsCompleted}</div>
          <div className={styles.statLabel}>Lessons Completed</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: '#64748b' }}>{stats.totalLessons}</div>
          <div className={styles.statLabel}>Total Lessons</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: stats.averageGrade != null && stats.averageGrade >= 75 ? '#059669' : '#d97706' }}>
            {stats.averageGrade != null ? `${stats.averageGrade}%` : '—'}
          </div>
          <div className={styles.statLabel}>Average Grade</div>
        </div>
      </section>

      {/* Overall Mastery Health */}
      {masterySummary.totalSkills > 0 && (
        <section className={styles.masteryWidget} aria-label="Mastery overview" style={{ marginBottom: 24 }}>
          <h3 className={styles.masteryWidgetTitle}>🧠 Mastery Overview</h3>
          <div className={styles.masteryStateGrid}>
            <div className={styles.masteryStateItem} style={{ background: '#f0fdf4' }}>
              <div className={styles.masteryStateCount} style={{ color: '#059669' }}>{masterySummary.masteredCount}</div>
              <div className={styles.masteryStateLabel} style={{ color: '#047857' }}>Mastered</div>
            </div>
            <div className={styles.masteryStateItem} style={{ background: '#eff6ff' }}>
              <div className={styles.masteryStateCount} style={{ color: '#2563eb' }}>{masterySummary.developingCount}</div>
              <div className={styles.masteryStateLabel} style={{ color: '#1d4ed8' }}>Developing</div>
            </div>
            <div className={styles.masteryStateItem} style={{ background: '#fffbeb' }}>
              <div className={styles.masteryStateCount} style={{ color: '#d97706' }}>{masterySummary.reviewDueCount}</div>
              <div className={styles.masteryStateLabel} style={{ color: '#b45309' }}>Review Due</div>
            </div>
            <div className={styles.masteryStateItem} style={{ background: '#fef2f2' }}>
              <div className={styles.masteryStateCount} style={{ color: '#dc2626' }}>{masterySummary.needsSupportCount}</div>
              <div className={styles.masteryStateLabel} style={{ color: '#b91c1c' }}>Needs Support</div>
            </div>
          </div>
          <div className={styles.masteryHealthBar}>
            {(() => {
              const total = masterySummary.masteredCount + masterySummary.developingCount + masterySummary.reviewDueCount + masterySummary.needsSupportCount;
              const pct = (n: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : '0%';
              return (
                <>
                  <div className={styles.masteryHealthSegment} style={{ width: pct(masterySummary.masteredCount), background: '#059669' }} />
                  <div className={styles.masteryHealthSegment} style={{ width: pct(masterySummary.developingCount), background: '#3b82f6' }} />
                  <div className={styles.masteryHealthSegment} style={{ width: pct(masterySummary.reviewDueCount), background: '#f59e0b' }} />
                  <div className={styles.masteryHealthSegment} style={{ width: pct(masterySummary.needsSupportCount), background: '#ef4444' }} />
                </>
              );
            })()}
          </div>
          <div className={styles.masteryHealthLabel}>
            <span>{masterySummary.masteredCount} of {masterySummary.totalSkills} skills mastered</span>
            <span>{Math.round((masterySummary.masteredCount / Math.max(masterySummary.totalSkills, 1)) * 100)}% mastery</span>
          </div>
        </section>
      )}

      {/* Per-course progress + mastery health */}
      <section className={styles.dashCard}>
        <h3 className={styles.cardTitle}>Progress by Course</h3>
        {enrollments.map((course, i) => (
          <div key={course.subjectId} className={styles.courseDetailRow} style={i > 0 ? { borderTop: '1px solid #f1f5f9', paddingTop: 16, marginTop: 16 } : undefined}>
            <div className={styles.courseDetailHeader}>
              <span className={styles.courseDetailIcon}>{course.subjectIcon}</span>
              <div className={styles.courseDetailName}>{course.subjectName}</div>
              <span
                className={styles.pacingBadge}
                style={{ background: course.pacingStyle.bg, color: course.pacingStyle.color }}
              >
                {course.pacingStyle.icon} {course.pacing.academicLabel}
              </span>
            </div>

            <div className={styles.courseDetailGrid}>
              <div className={styles.courseDetailStat}>
                <div className={styles.courseDetailStatLabel}>Completed</div>
                <div className={styles.courseDetailStatValue}>{course.completedLessons}</div>
                <div className={styles.courseDetailStatNote}>of {course.totalLessons} lessons</div>
              </div>
              <div className={styles.courseDetailStat}>
                <div className={styles.courseDetailStatLabel}>Progress</div>
                <div className={styles.courseDetailStatValue}>{course.progressPercent}%</div>
                <div className={styles.courseDetailStatNote}>complete</div>
              </div>
              <div className={styles.courseDetailStat}>
                <div className={styles.courseDetailStatLabel}>Grade</div>
                <div className={styles.courseDetailStatValue}>
                  {course.averageScore != null ? `${course.averageScore}%` : '—'}
                </div>
                <div className={styles.courseDetailStatNote}>{course.gradeLabel}</div>
              </div>
              <div className={styles.courseDetailStat}>
                <div className={styles.courseDetailStatLabel}>Mastery</div>
                <div className={styles.courseDetailStatValue} style={{ color: '#059669' }}>
                  {course.mastery.totalSkills > 0
                    ? `${Math.round((course.mastery.masteredSkills / course.mastery.totalSkills) * 100)}%`
                    : '—'}
                </div>
                <div className={styles.courseDetailStatNote}>
                  {course.mastery.totalSkills > 0
                    ? `${course.mastery.masteredSkills}/${course.mastery.totalSkills} skills`
                    : 'No skills yet'}
                </div>
              </div>
            </div>

            {/* Mastery health chips per course */}
            {course.mastery.totalSkills > 0 && (
              <div className={styles.masteryHealthRow}>
                <div className={styles.masteryHealthChip} style={{ background: '#f0fdf4', color: '#059669' }}>
                  <span className={styles.masteryHealthChipDot} style={{ background: '#059669' }} />
                  {course.mastery.masteredSkills} Mastered
                </div>
                <div className={styles.masteryHealthChip} style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <span className={styles.masteryHealthChipDot} style={{ background: '#3b82f6' }} />
                  {course.mastery.developingSkills} Developing
                </div>
                <div className={styles.masteryHealthChip} style={{ background: '#fffbeb', color: '#d97706' }}>
                  <span className={styles.masteryHealthChipDot} style={{ background: '#f59e0b' }} />
                  {course.mastery.reviewDue} Review
                </div>
                <div className={styles.masteryHealthChip} style={{ background: '#fef2f2', color: '#dc2626' }}>
                  <span className={styles.masteryHealthChipDot} style={{ background: '#ef4444' }} />
                  {course.mastery.needsSupport} Support
                </div>
              </div>
            )}

            <div className={styles.pacingBar}>
              <div className={styles.pacingBarLabel}>
                <span>Expected: {Math.round(course.pacing.expectedProgress)}%</span>
                <span>Actual: {Math.round(course.pacing.actualProgress)}%</span>
              </div>
              <div className={styles.pacingBarTrack}>
                <div className={styles.pacingBarExpected} style={{ width: `${course.pacing.expectedProgress}%` }} />
                <div className={styles.pacingBarActual} style={{ width: `${course.pacing.actualProgress}%` }} />
              </div>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

import styles from '../student.module.css';
import { getStudentDashboardData } from '@/lib/student-data';

export default async function ProgressPage() {
  const data = await getStudentDashboardData();
  const { enrollments, stats } = data;

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

      {/* Per-course progress */}
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
                <div className={styles.courseDetailStatLabel}>Missing</div>
                <div className={styles.courseDetailStatValue} style={{ color: course.missingAssignments > 0 ? '#dc2626' : '#059669' }}>
                  {course.missingAssignments}
                </div>
                <div className={styles.courseDetailStatNote}>assignments</div>
              </div>
            </div>

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

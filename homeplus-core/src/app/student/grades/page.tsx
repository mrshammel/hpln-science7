import styles from '../student.module.css';
import { getStudentDashboardData } from '@/lib/student-data';

export default async function GradesPage() {
  const data = await getStudentDashboardData();
  const { enrollments, stats } = data;

  return (
    <>
      <section className={styles.welcomeSection}>
        <h2 className={styles.welcomeTitle}>🎯 Grades</h2>
        <p className={styles.welcomeSubtext}>Your grades and performance across all courses</p>
      </section>

      {/* Overall average */}
      <section className={styles.statRow} style={{ marginBottom: 24 }}>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: stats.averageGrade != null && stats.averageGrade >= 75 ? '#059669' : '#d97706' }}>
            {stats.averageGrade != null ? `${stats.averageGrade}%` : '—'}
          </div>
          <div className={styles.statLabel}>Overall Average</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: '#2563eb' }}>{stats.activeCourses}</div>
          <div className={styles.statLabel}>Courses</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: '#059669' }}>{stats.lessonsCompleted}</div>
          <div className={styles.statLabel}>Lessons Completed</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: stats.feedbackAvailable > 0 ? '#f59e0b' : '#64748b' }}>{stats.feedbackAvailable}</div>
          <div className={styles.statLabel}>Reviews Available</div>
        </div>
      </section>

      {/* Per-course grades */}
      <section className={styles.dashCard}>
        <h3 className={styles.cardTitle}>Grades by Course</h3>
        {enrollments.map((course, i) => (
          <div key={course.subjectId} className={styles.courseDetailRow} style={i > 0 ? { borderTop: '1px solid #f1f5f9', paddingTop: 16, marginTop: 16 } : undefined}>
            <div className={styles.courseDetailHeader}>
              <span className={styles.courseDetailIcon}>{course.subjectIcon}</span>
              <div className={styles.courseDetailName}>{course.subjectName}</div>
              <span
                className={styles.pacingBadge}
                style={{
                  background: course.averageScore != null && course.averageScore >= 75 ? '#d1fae5' : course.averageScore != null ? '#fef3c7' : '#f3f4f6',
                  color: course.averageScore != null && course.averageScore >= 75 ? '#059669' : course.averageScore != null ? '#d97706' : '#6b7280',
                }}
              >
                {course.gradeLabel}
              </span>
            </div>

            <div className={styles.courseDetailGrid}>
              <div className={styles.courseDetailStat}>
                <div className={styles.courseDetailStatLabel}>Grade</div>
                <div className={styles.courseDetailStatValue} style={{ color: course.averageScore != null && course.averageScore >= 75 ? '#059669' : '#d97706' }}>
                  {course.averageScore != null ? `${course.averageScore}%` : '—'}
                </div>
                <div className={styles.courseDetailStatNote}>{course.gradeLabel}</div>
              </div>
              <div className={styles.courseDetailStat}>
                <div className={styles.courseDetailStatLabel}>Progress</div>
                <div className={styles.courseDetailStatValue}>{course.progressPercent}%</div>
                <div className={styles.courseDetailStatNote}>{course.completedLessons}/{course.totalLessons}</div>
              </div>
              <div className={styles.courseDetailStat}>
                <div className={styles.courseDetailStatLabel}>Missing</div>
                <div className={styles.courseDetailStatValue} style={{ color: course.missingAssignments > 0 ? '#dc2626' : '#059669' }}>
                  {course.missingAssignments}
                </div>
                <div className={styles.courseDetailStatNote}>assignments</div>
              </div>
              <div className={styles.courseDetailStat}>
                <div className={styles.courseDetailStatLabel}>Latest Review</div>
                <div className={styles.courseDetailStatValue} style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  {course.latestReviewedItem ? '✅' : '—'}
                </div>
                <div className={styles.courseDetailStatNote} style={{ fontSize: '0.68rem' }}>
                  {course.latestReviewedItem || 'None yet'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

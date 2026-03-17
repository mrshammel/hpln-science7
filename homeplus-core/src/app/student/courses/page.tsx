import Link from 'next/link';
import styles from '../student.module.css';
import { getStudentDashboardData } from '@/lib/student-data';

export default async function CoursesPage() {
  const data = await getStudentDashboardData();
  const { enrollments } = data;

  return (
    <>
      <section className={styles.welcomeSection}>
        <h2 className={styles.welcomeTitle}>📚 My Courses</h2>
        <p className={styles.welcomeSubtext}>All courses you are enrolled in</p>
      </section>

      <div className={styles.courseGrid}>
        {enrollments.map((course) => (
          <Link
            key={course.subjectId}
            href={`/student/courses/${course.subjectId}`}
            className={styles.courseCard}
            aria-label={`Open ${course.subjectName}`}
          >
            <div className={styles.courseCardHeader}>
              <span className={styles.courseCardIcon}>{course.subjectIcon}</span>
              <span className={styles.courseCardGrade}>Grade {course.gradeLevel}</span>
            </div>
            <h4 className={styles.courseCardTitle}>{course.subjectName}</h4>
            <div className={styles.courseCardUnit}>{course.currentUnit || 'All units complete'}</div>

            <div className={styles.courseCardProgress}>
              <div className={styles.progressBar} style={{ width: '100%', height: 6 }}>
                <div className={styles.progressFill} style={{ width: `${course.progressPercent}%` }} />
              </div>
              <div className={styles.courseCardProgressRow}>
                <span>{course.completedLessons}/{course.totalLessons} lessons</span>
                <span className={styles.progressPercent}>{course.progressPercent}%</span>
              </div>
            </div>

            <div className={styles.courseCardFooter}>
              <span className={styles.courseCardGradeLabel}>
                {course.averageScore != null ? `${course.averageScore}% · ${course.gradeLabel}` : 'No grades yet'}
              </span>
              <span
                className={styles.pacingBadge}
                style={{ background: course.pacingStyle.bg, color: course.pacingStyle.color }}
              >
                {course.pacingStyle.icon} {course.pacing.academicLabel}
              </span>
            </div>

            <div className={styles.courseCardCta}>
              Open Course →
            </div>
          </Link>
        ))}
      </div>

      {enrollments.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📭</div>
          <div className={styles.emptyText}>No courses enrolled yet.</div>
          <Link href="/student/dashboard" style={{ color: '#2563eb', marginTop: 8, display: 'inline-block' }}>
            ← Back to Dashboard
          </Link>
        </div>
      )}
    </>
  );
}

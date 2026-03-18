import Link from 'next/link';
import styles from '../student.module.css';
import { getStudentDashboardData } from '@/lib/student-data';
import { subjectColorVars } from '@/lib/subject-colors';

export default async function CoursesPage() {
  const data = await getStudentDashboardData();
  const { enrollments } = data;

  return (
    <>
      <section className={styles.welcomeSection}>
        <h2 className={styles.welcomeTitle}>📚 My Courses</h2>
        <p className={styles.welcomeSubtext}>{enrollments.length} course{enrollments.length !== 1 ? 's' : ''} enrolled</p>
      </section>

      <div className={styles.courseGrid}>
        {enrollments.map((course) => (
          <Link
            key={course.subjectId}
            href={`/student/courses/${course.subjectId}`}
            className={styles.courseCard}
            style={subjectColorVars(course.subjectName)}
            aria-label={`Open ${course.subjectName}`}
          >
            <div className={styles.courseCardBand} />
            <div className={styles.courseCardBody}>
              <div className={styles.courseCardHeader}>
                <span className={styles.courseCardIcon}>{course.subjectIcon}</span>
                <span className={styles.courseCardGrade}>Grade {course.gradeLevel}</span>
              </div>
              <h4 className={styles.courseCardTitle}>{course.subjectName}</h4>
              <div className={styles.courseCardUnit}>{course.currentUnit || '✅ All done!'}</div>

              <div className={styles.courseCardProgress}>
                <div className={styles.progressBar} style={{ width: '100%', height: 8 }}>
                  <div className={styles.progressFill} style={{ width: `${course.progressPercent}%` }} />
                </div>
                <div className={styles.courseCardProgressRow}>
                  <span>{course.completedLessons}/{course.totalLessons} lessons</span>
                  <span className={styles.progressPercent}>{course.progressPercent}%</span>
                </div>
              </div>

              <div className={styles.courseCardFooter}>
                <span className={styles.courseCardGradeLabel}>
                  {course.averageScore != null ? `${course.averageScore}%` : 'No grades yet'}
                </span>
                {course.progressPercent === 100 ? (
                  <span className={`${styles.statusChip} ${styles.statusComplete}`}>✅ Complete</span>
                ) : course.progressPercent > 0 ? (
                  <span className={`${styles.statusChip} ${styles.statusInProgress}`}>📝 In Progress</span>
                ) : (
                  <span className={`${styles.statusChip} ${styles.statusAvailable}`}>Start →</span>
                )}
              </div>

              <div className={styles.courseCardCta}>
                {course.progressPercent > 0 ? 'Continue →' : 'Start Course →'}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

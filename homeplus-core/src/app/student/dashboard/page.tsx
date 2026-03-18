// ============================================
// Student Dashboard — Home Plus LMS
// ============================================
// Server component: hero continue-learning,
// softer stats, polished course cards.

import { getStudentDashboardData } from '@/lib/student-data';
import { subjectColorVars } from '@/lib/subject-colors';
import styles from '../student.module.css';

export default async function StudentDashboard() {
  const data = await getStudentDashboardData();
  const { profile, enrollments, upcoming, recentActivity, feedback, stats } = data;
  const firstName = profile.name.split(' ')[0] || 'Student';

  return (
    <>
      {/* ===== A. WELCOME ===== */}
      <section className={styles.welcomeSection} aria-label="Student welcome">
        <div className={styles.welcomeRow}>
          <div className={styles.welcomeAvatar}>
            {profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar} alt={profile.name} className={styles.welcomeAvatarImg} />
            ) : (
              <span className={styles.welcomeAvatarFallback}>
                {profile.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            )}
          </div>
          <div>
            <h2 className={styles.welcomeTitle}>Welcome back, {firstName} 👋</h2>
            <p className={styles.welcomeSubtext}>
              {profile.gradeLevel ? `Grade ${profile.gradeLevel}` : 'Student'} · {stats.activeCourses} course{stats.activeCourses !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </section>

      {/* ===== B. HERO CONTINUE LEARNING ===== */}
      {enrollments.length > 0 && enrollments[0].currentLesson && (
        <a
          href={`/student/courses/${enrollments[0].subjectId}`}
          className={styles.heroCard}
          style={subjectColorVars(enrollments[0].subjectName)}
          aria-label="Continue learning"
        >
          <div className={styles.heroIcon}>{enrollments[0].subjectIcon}</div>
          <div className={styles.heroInfo}>
            <div className={styles.heroLabel}>▶ Continue Learning</div>
            <div className={styles.heroTitle}>{enrollments[0].subjectName}</div>
            <div className={styles.heroSubtitle}>
              {enrollments[0].currentUnit} · {enrollments[0].currentLesson}
            </div>
            <div className={styles.heroProgress}>
              <div className={styles.heroProgressBar}>
                <div className={styles.heroProgressFill} style={{ width: `${enrollments[0].progressPercent}%` }} />
              </div>
              <span className={styles.heroProgressText}>{enrollments[0].progressPercent}%</span>
            </div>
          </div>
          <span className={styles.heroBtn}>Continue →</span>
        </a>
      )}

      {/* ===== C. QUICK STATS ===== */}
      <section className={styles.statRow} aria-label="Quick stats">
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: '#6366f1' }}>{stats.activeCourses}</div>
          <div className={styles.statLabel}>My Courses</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: '#059669' }}>{stats.overallProgress}%</div>
          <div className={styles.statLabel}>Progress</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: stats.averageGrade != null && stats.averageGrade >= 75 ? '#059669' : '#d97706' }}>
            {stats.averageGrade != null ? `${stats.averageGrade}%` : '—'}
          </div>
          <div className={styles.statLabel}>My Grade</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: stats.assignmentsDue > 0 ? '#dc2626' : '#059669' }}>
            {stats.assignmentsDue > 0 ? stats.assignmentsDue : '✅'}
          </div>
          <div className={styles.statLabel}>{stats.assignmentsDue > 0 ? 'To Do' : 'All Done'}</div>
        </div>
      </section>

      {/* ===== D. MY COURSES ===== */}
      <section aria-label="Enrolled courses" style={{ marginBottom: 28 }}>
        <h3 className={styles.sectionHeading}>📚 My Courses</h3>
        <div className={styles.courseGrid}>
          {enrollments.map((course) => (
            <a
              key={course.subjectId}
              href={`/student/courses/${course.subjectId}`}
              className={styles.courseCard}
              style={subjectColorVars(course.subjectName)}
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

                {course.missingAssignments > 0 && (
                  <div className={styles.missingBadge}>
                    ⚠️ {course.missingAssignments} missing
                  </div>
                )}

                <div className={styles.courseCardCta}>
                  {course.progressPercent > 0 ? 'Continue →' : 'Start Course →'}
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ===== E. MY GRADES & PROGRESS ===== */}
      <section aria-label="Grades and progress" style={{ marginBottom: 28 }}>
        <h3 className={styles.sectionHeading}>📊 My Grades & Progress</h3>
        <div className={styles.dashCard}>
          {enrollments.map((course, i) => (
            <div key={course.subjectId} className={styles.courseDetailRow} style={{ ...subjectColorVars(course.subjectName), ...(i > 0 ? { borderTop: '1px solid #f0f2f5', paddingTop: 16, marginTop: 16 } : {}) }}>
              <div className={styles.courseDetailHeader}>
                <span className={styles.courseDetailIcon}>{course.subjectIcon}</span>
                <div className={styles.courseDetailName}>{course.subjectName}</div>
                {course.progressPercent === 100 ? (
                  <span className={`${styles.statusChip} ${styles.statusComplete}`}>✅ Complete</span>
                ) : course.progressPercent > 0 ? (
                  <span className={`${styles.statusChip} ${styles.statusInProgress}`}>📝 In Progress</span>
                ) : (
                  <span className={`${styles.statusChip} ${styles.statusAvailable}`}>Not Started</span>
                )}
              </div>
              <div className={styles.courseDetailGrid}>
                <div className={styles.courseDetailStat}>
                  <div className={styles.courseDetailStatLabel}>My Grade</div>
                  <div className={styles.courseDetailStatValue}>
                    {course.averageScore != null ? `${course.averageScore}%` : '—'}
                  </div>
                  <div className={styles.courseDetailStatNote}>{course.gradeLabel}</div>
                </div>
                <div className={styles.courseDetailStat}>
                  <div className={styles.courseDetailStatLabel}>Progress</div>
                  <div className={styles.courseDetailStatValue}>{course.progressPercent}%</div>
                  <div className={styles.courseDetailStatNote}>{course.completedLessons}/{course.totalLessons} lessons</div>
                </div>
                <div className={styles.courseDetailStat}>
                  <div className={styles.courseDetailStatLabel}>Status</div>
                  <div className={styles.courseDetailStatValue} style={{ color: course.pacingStyle.color }}>
                    {course.pacing.academicLabel}
                  </div>
                  <div className={styles.courseDetailStatNote}>{course.pacing.pacingSummary}</div>
                </div>
                <div className={styles.courseDetailStat}>
                  <div className={styles.courseDetailStatLabel}>To Do</div>
                  <div className={styles.courseDetailStatValue} style={{ color: course.missingAssignments > 0 ? '#dc2626' : '#059669' }}>
                    {course.missingAssignments > 0 ? course.missingAssignments : '✅'}
                  </div>
                  <div className={styles.courseDetailStatNote}>{course.missingAssignments > 0 ? 'Need attention' : 'All done!'}</div>
                </div>
              </div>
              <div className={styles.pacingBar}>
                <div className={styles.pacingBarLabel}>
                  <span>Where I should be: {Math.round(course.pacing.expectedProgress)}%</span>
                  <span>Where I am: {Math.round(course.pacing.actualProgress)}%</span>
                </div>
                <div className={styles.pacingBarTrack}>
                  <div className={styles.pacingBarExpected} style={{ width: `${course.pacing.expectedProgress}%` }} />
                  <div className={styles.pacingBarActual} style={{ width: `${course.pacing.actualProgress}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== F. UPCOMING & ACTIVITY ===== */}
      <div className={styles.dashGrid}>
        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section className={styles.dashCard} aria-label="Upcoming work">
            <h3 className={styles.cardTitle}>📝 Upcoming</h3>
            {upcoming.map((item) => (
              <div key={item.id} className={styles.upcomingItem}>
                <span className={styles.upcomingIcon}>{item.courseIcon}</span>
                <div className={styles.upcomingInfo}>
                  <div className={styles.upcomingTitle}>{item.title}</div>
                  <div className={styles.upcomingMeta}>{item.courseName} · {item.dueLabel}</div>
                </div>
                <span
                  className={styles.upcomingStatus}
                  style={{
                    background: item.status === 'overdue' ? '#fee2e2' : item.status === 'due-today' ? '#fef3c7' : '#f1f5f9',
                    color: item.status === 'overdue' ? '#dc2626' : item.status === 'due-today' ? '#d97706' : '#64748b',
                  }}
                >
                  {item.statusLabel}
                </span>
              </div>
            ))}
          </section>
        )}

        {/* Recent Activity */}
        <section className={styles.dashCard} aria-label="Recent activity">
          <h3 className={styles.cardTitle}>🕐 Recent Activity</h3>
          {recentActivity.length > 0 ? (
            recentActivity.map((item) => (
              <div key={item.id} className={styles.activityItem}>
                <div className={styles.activityDot} style={{ background: item.dotColor }} />
                <div>
                  <div className={styles.activityText}>{item.description}</div>
                  <div className={styles.activityTime}>{item.detail} · {item.timeAgo}</div>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📭</div>
              <div className={styles.emptyText}>No activity yet — start a lesson!</div>
            </div>
          )}
        </section>

        {/* Feedback */}
        <section className={styles.dashCard} aria-label="Feedback">
          <h3 className={styles.cardTitle}>💬 Feedback</h3>
          {feedback.length > 0 ? (
            feedback.map((item) => (
              <div key={item.id} className={styles.feedbackItem}>
                <div className={styles.feedbackHeader}>
                  <span className={styles.feedbackTitle}>{item.activityTitle}</span>
                  {item.reviewed && item.finalizedByTeacher && (
                    <span className={styles.feedbackBadge} style={{ background: '#d1fae5', color: '#059669' }}>✅ Reviewed</span>
                  )}
                  {item.aiFeedback && !item.finalizedByTeacher && (
                    <span className={styles.feedbackBadge} style={{ background: '#dbeafe', color: '#2563eb' }}>🤖 AI Feedback</span>
                  )}
                  {!item.reviewed && !item.aiFeedback && (
                    <span className={styles.feedbackBadge} style={{ background: '#f3f4f6', color: '#6b7280' }}>⏳ Pending</span>
                  )}
                </div>
                <div className={styles.feedbackMeta}>
                  {item.courseName}
                  {item.score != null && item.maxScore != null && <> · {item.score}/{item.maxScore}</>}
                </div>
                {(item.teacherFeedback || item.aiFeedback) && (
                  <div className={styles.feedbackPreview}>
                    {item.teacherFeedback || item.aiFeedback}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📬</div>
              <div className={styles.emptyText}>No feedback yet — submit some work!</div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

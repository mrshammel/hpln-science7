// ============================================
// Student Dashboard — Home Plus LMS
// ============================================
// Server component that loads real student data
// and renders the full dashboard. All 9 sections.

import { getStudentDashboardData } from '@/lib/student-data';
import styles from '../student.module.css';

export default async function StudentDashboard() {
  const data = await getStudentDashboardData();
  const { profile, enrollments, upcoming, recentActivity, feedback, stats } = data;
  const firstName = profile.name.split(' ')[0] || 'Student';

  return (
    <>
      {/* ===== A. STUDENT HEADER ===== */}
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
              {profile.gradeLevel ? `Grade ${profile.gradeLevel} Student` : 'Student'} · {stats.activeCourses} active course{stats.activeCourses !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </section>

      {/* ===== B. SUMMARY / OVERVIEW CARDS ===== */}
      <section className={styles.statRow} aria-label="Quick stats">
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: '#2563eb' }}>{stats.activeCourses}</div>
          <div className={styles.statLabel}>Active Courses</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: '#059669' }}>{stats.overallProgress}%</div>
          <div className={styles.statLabel}>Overall Progress</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: stats.averageGrade != null && stats.averageGrade >= 75 ? '#059669' : '#d97706' }}>
            {stats.averageGrade != null ? `${stats.averageGrade}%` : '—'}
          </div>
          <div className={styles.statLabel}>Average Grade</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: stats.assignmentsDue > 0 ? '#dc2626' : '#64748b' }}>
            {stats.assignmentsDue}
          </div>
          <div className={styles.statLabel}>Items Due</div>
        </div>
      </section>

      {/* ===== C. CONTINUE LEARNING ===== */}
      {enrollments.length > 0 && enrollments[0].currentLesson && (
        <section className={styles.dashCard} style={{ marginBottom: 20 }} aria-label="Continue learning">
          <h3 className={styles.cardTitle}>
            ▶️ Continue Learning
          </h3>
          <div className={styles.continueCard}>
            <div className={styles.continueIcon}>{enrollments[0].subjectIcon}</div>
            <div className={styles.continueInfo}>
              <div className={styles.continueCourse}>{enrollments[0].subjectName}</div>
              <div className={styles.continueUnit}>{enrollments[0].currentUnit}</div>
              <div className={styles.continueLesson}>{enrollments[0].currentLesson}</div>
              <div className={styles.continueProgress}>
                <div className={styles.progressBar} style={{ width: '100%' }}>
                  <div className={styles.progressFill} style={{ width: `${enrollments[0].progressPercent}%` }} />
                </div>
                <span className={styles.progressPercent}>{enrollments[0].progressPercent}% complete</span>
              </div>
            </div>
            <a href={`/student/courses/${enrollments[0].subjectId}`} className={styles.continueBtn}>
              Continue →
            </a>
          </div>
        </section>
      )}

      {/* ===== D. ENROLLED COURSES ===== */}
      <section aria-label="Enrolled courses" style={{ marginBottom: 20 }}>
        <h3 className={styles.sectionHeading}>📚 My Courses</h3>
        <div className={styles.courseGrid}>
          {enrollments.map((course) => (
            <a
              key={course.subjectId}
              href={`/student/courses/${course.subjectId}`}
              className={styles.courseCard}
            >
              <div className={styles.courseCardHeader}>
                <span className={styles.courseCardIcon}>{course.subjectIcon}</span>
                <span className={styles.courseCardGrade}>Grade {course.gradeLevel}</span>
              </div>
              <h4 className={styles.courseCardTitle}>{course.subjectName}</h4>
              <div className={styles.courseCardUnit}>{course.currentUnit || 'All units complete'}</div>

              {/* Progress bar */}
              <div className={styles.courseCardProgress}>
                <div className={styles.progressBar} style={{ width: '100%', height: 6 }}>
                  <div className={styles.progressFill} style={{ width: `${course.progressPercent}%` }} />
                </div>
                <div className={styles.courseCardProgressRow}>
                  <span>{course.completedLessons}/{course.totalLessons} lessons</span>
                  <span className={styles.progressPercent}>{course.progressPercent}%</span>
                </div>
              </div>

              {/* Grade + Pacing */}
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

              {course.missingAssignments > 0 && (
                <div className={styles.missingBadge}>
                  ⚠️ {course.missingAssignments} missing
                </div>
              )}
            </a>
          ))}
        </div>
      </section>

      {/* ===== E + F. GRADES, PROGRESS & PACING BY COURSE ===== */}
      <section aria-label="Grades and pacing by course" style={{ marginBottom: 20 }}>
        <h3 className={styles.sectionHeading}>📊 Grades, Progress & Pacing</h3>
        <div className={styles.dashCard}>
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
                {/* Grade */}
                <div className={styles.courseDetailStat}>
                  <div className={styles.courseDetailStatLabel}>Grade</div>
                  <div className={styles.courseDetailStatValue}>
                    {course.averageScore != null ? `${course.averageScore}%` : '—'}
                  </div>
                  <div className={styles.courseDetailStatNote}>{course.gradeLabel}</div>
                </div>

                {/* Progress */}
                <div className={styles.courseDetailStat}>
                  <div className={styles.courseDetailStatLabel}>Progress</div>
                  <div className={styles.courseDetailStatValue}>{course.progressPercent}%</div>
                  <div className={styles.courseDetailStatNote}>
                    {course.completedLessons}/{course.totalLessons} lessons
                  </div>
                </div>

                {/* Pacing */}
                <div className={styles.courseDetailStat}>
                  <div className={styles.courseDetailStatLabel}>Pacing</div>
                  <div className={styles.courseDetailStatValue} style={{ color: course.pacingStyle.color }}>
                    {course.pacing.daysBehindOrAhead >= 0 ? '+' : ''}{course.pacing.daysBehindOrAhead}d
                  </div>
                  <div className={styles.courseDetailStatNote}>{course.pacing.pacingSummary}</div>
                </div>

                {/* Missing */}
                <div className={styles.courseDetailStat}>
                  <div className={styles.courseDetailStatLabel}>Missing</div>
                  <div className={styles.courseDetailStatValue} style={{ color: course.missingAssignments > 0 ? '#dc2626' : '#059669' }}>
                    {course.missingAssignments}
                  </div>
                  <div className={styles.courseDetailStatNote}>
                    {course.missingAssignments > 0 ? 'Need attention' : 'All submitted'}
                  </div>
                </div>
              </div>

              {/* Expected vs actual progress */}
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

              {course.latestReviewedItem && (
                <div className={styles.courseDetailLatest}>
                  Latest reviewed: <strong>{course.latestReviewedItem}</strong>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ===== G. UPCOMING WORK ===== */}
      {upcoming.length > 0 && (
        <section className={styles.dashCard} style={{ marginBottom: 20 }} aria-label="Upcoming work">
          <h3 className={styles.cardTitle}>📝 Upcoming Work</h3>
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

      {/* ===== H + I. RECENT ACTIVITY & FEEDBACK ===== */}
      <div className={styles.dashGrid}>
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

        {/* Feedback Snapshot */}
        <section className={styles.dashCard} aria-label="Feedback and reviews">
          <h3 className={styles.cardTitle}>💬 Feedback & Reviews</h3>
          {feedback.length > 0 ? (
            feedback.map((item) => (
              <div key={item.id} className={styles.feedbackItem}>
                <div className={styles.feedbackHeader}>
                  <span className={styles.feedbackTitle}>{item.activityTitle}</span>
                  {item.reviewed && item.finalizedByTeacher && (
                    <span className={styles.feedbackBadge} style={{ background: '#d1fae5', color: '#059669' }}>
                      ✅ Teacher Reviewed
                    </span>
                  )}
                  {item.aiFeedback && !item.finalizedByTeacher && (
                    <span className={styles.feedbackBadge} style={{ background: '#dbeafe', color: '#2563eb' }}>
                      🤖 AI Feedback
                    </span>
                  )}
                  {!item.reviewed && !item.aiFeedback && (
                    <span className={styles.feedbackBadge} style={{ background: '#f3f4f6', color: '#6b7280' }}>
                      ⏳ Awaiting Review
                    </span>
                  )}
                </div>
                <div className={styles.feedbackMeta}>
                  {item.courseName}
                  {item.score != null && item.maxScore != null && (
                    <> · Score: {item.score}/{item.maxScore}</>
                  )}
                  {item.aiPerformanceLevel && (
                    <> · {item.aiPerformanceLevel}</>
                  )}
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

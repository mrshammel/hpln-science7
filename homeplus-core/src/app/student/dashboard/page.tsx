// ============================================
// Student Dashboard — Home Plus LMS
// ============================================
// Server component: hero continue-learning,
// mastery widgets, softer stats, polished course cards.

import Link from 'next/link';
import { getStudentDashboardData } from '@/lib/student-data';
import { subjectColorVars } from '@/lib/subject-colors';
import styles from '../student.module.css';

export default async function StudentDashboard() {
  const data = await getStudentDashboardData();
  const { profile, enrollments, upcoming, recentActivity, feedback, masterySummary, stats } = data;
  const firstName = profile.name.split(' ')[0] || 'Student';

  const totalMastery = masterySummary.masteredCount + masterySummary.developingCount + masterySummary.reviewDueCount + masterySummary.needsSupportCount;
  const masteryPercent = (n: number) => totalMastery > 0 ? `${Math.round((n / totalMastery) * 100)}%` : '0%';

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

      {/* ===== NEW: TODAY'S REVIEW CARD ===== */}
      {(masterySummary.reviewDueCount > 0 || masterySummary.reviewCompletedToday > 0) && (
        <Link href="/student/review" className={styles.reviewCard} id="todays-review-card">
          <div className={styles.reviewCardIcon}>🔄</div>
          <div className={styles.reviewCardInfo}>
            <div className={styles.reviewCardTitle}>Today&apos;s Review</div>
            <div className={styles.reviewCardMeta}>
              <span className={styles.reviewCardMetaItem}>
                📋 {masterySummary.reviewDueCount} skill{masterySummary.reviewDueCount !== 1 ? 's' : ''} to review
              </span>
              {masterySummary.needsSupportCount > 0 && (
                <span className={styles.reviewCardMetaItem}>
                  ⚠️ {masterySummary.needsSupportCount} need{masterySummary.needsSupportCount !== 1 ? '' : 's'} support
                </span>
              )}
              {masterySummary.reviewCompletedToday > 0 && (
                <span className={styles.reviewCardMetaItem}>
                  ✅ {masterySummary.reviewCompletedToday} done today
                </span>
              )}
            </div>
          </div>
          <span className={styles.reviewCardBtn}>Start Review →</span>
        </Link>
      )}

      {/* ===== NEW: MY MASTERY WIDGET ===== */}
      {totalMastery > 0 && (
        <section className={styles.masteryWidget} aria-label="My mastery" id="my-mastery-widget">
          <h3 className={styles.masteryWidgetTitle}>🧠 My Mastery</h3>
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
          {/* Stacked health bar */}
          <div className={styles.masteryHealthBar}>
            <div className={styles.masteryHealthSegment} style={{ width: masteryPercent(masterySummary.masteredCount), background: '#059669' }} />
            <div className={styles.masteryHealthSegment} style={{ width: masteryPercent(masterySummary.developingCount), background: '#3b82f6' }} />
            <div className={styles.masteryHealthSegment} style={{ width: masteryPercent(masterySummary.reviewDueCount), background: '#f59e0b' }} />
            <div className={styles.masteryHealthSegment} style={{ width: masteryPercent(masterySummary.needsSupportCount), background: '#ef4444' }} />
          </div>
          <div className={styles.masteryHealthLabel}>
            <span>{masterySummary.masteredCount} of {masterySummary.totalSkills} skills mastered</span>
            <span>{Math.round((masterySummary.masteredCount / Math.max(masterySummary.totalSkills, 1)) * 100)}% mastery</span>
          </div>
        </section>
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

                {/* Mastery strip per course */}
                {course.mastery.totalSkills > 0 && (
                  <div className={styles.courseMasteryStrip}>
                    <span className={styles.masteryDot}>
                      <span className={styles.masteryDotCircle} style={{ background: '#059669' }} />
                      {course.mastery.masteredSkills}
                    </span>
                    <span className={styles.masteryDot}>
                      <span className={styles.masteryDotCircle} style={{ background: '#3b82f6' }} />
                      {course.mastery.developingSkills}
                    </span>
                    {course.mastery.reviewDue > 0 && (
                      <span className={styles.masteryDot}>
                        <span className={styles.masteryDotCircle} style={{ background: '#f59e0b' }} />
                        {course.mastery.reviewDue}
                      </span>
                    )}
                    {course.mastery.needsSupport > 0 && (
                      <span className={styles.masteryDot}>
                        <span className={styles.masteryDotCircle} style={{ background: '#ef4444' }} />
                        {course.mastery.needsSupport}
                      </span>
                    )}
                  </div>
                )}

                {course.mastery.reviewDue > 0 && (
                  <div className={styles.reviewDueBadge}>
                    🔄 {course.mastery.reviewDue} review due
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

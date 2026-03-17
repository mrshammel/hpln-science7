import styles from '../student.module.css';
import { getStudentDashboardData } from '@/lib/student-data';

export default async function AssignmentsPage() {
  const data = await getStudentDashboardData();
  const { upcoming, feedback } = data;

  return (
    <>
      <section className={styles.welcomeSection}>
        <h2 className={styles.welcomeTitle}>📝 Assignments</h2>
        <p className={styles.welcomeSubtext}>Your upcoming and submitted work</p>
      </section>

      {/* Upcoming / Due Work */}
      <section className={styles.dashCard} style={{ marginBottom: 20 }}>
        <h3 className={styles.cardTitle}>🔔 Upcoming & Missing Work</h3>
        {upcoming.length > 0 ? (
          upcoming.map((item) => (
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
          ))
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>✅</div>
            <div className={styles.emptyText}>All caught up — no upcoming assignments!</div>
          </div>
        )}
      </section>

      {/* Recent Submissions with Feedback */}
      <section className={styles.dashCard}>
        <h3 className={styles.cardTitle}>💬 Recent Submissions & Feedback</h3>
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
            <div className={styles.emptyText}>No submissions yet — complete a lesson to get started!</div>
          </div>
        )}
      </section>
    </>
  );
}

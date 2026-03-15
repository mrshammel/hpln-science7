import styles from '../teacher.module.css';
import { getRecentSubmissions } from '@/lib/teacher-data';
import { getTeacherId } from '@/lib/teacher-auth';
import { resolveContext } from '@/lib/teacher-context';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SubmissionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const teacherId = await getTeacherId();
  const ctx = await resolveContext(params, teacherId);

  const submissions = await getRecentSubmissions(teacherId, ctx);
  const pending = submissions.filter((s) => !s.reviewed);
  const reviewed = submissions.filter((s) => s.reviewed);

  return (
    <>
      {/* Pending Reviews */}
      <div className={styles.dashCard} style={{ marginBottom: 24 }}>
        <h3 className={styles.cardTitle}>
          📋 Pending Review — {ctx.subjectName}
          {pending.length > 0 && (
            <span className={styles.navBadge} style={{ marginLeft: 8 }}>{pending.length}</span>
          )}
        </h3>

        {pending.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>✅</div>
            <div className={styles.emptyTitle}>All caught up!</div>
            <div className={styles.emptyDesc}>No {ctx.subjectName} submissions waiting for your review.</div>
          </div>
        ) : (
          pending.map((sub) => (
            <div key={sub.id} className={styles.submissionItem}>
              <div className={styles.attentionAvatar}>
                {sub.studentName.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className={styles.submissionInfo}>
                <div className={styles.submissionStudent}>{sub.studentName}</div>
                <div className={styles.submissionActivity}>
                  {sub.activityTitle} · {sub.activityType.charAt(0) + sub.activityType.slice(1).toLowerCase()}
                </div>
              </div>
              <span className={`${styles.reviewBadge} ${styles.reviewPending}`}>
                Needs Review
              </span>
              <div className={styles.submissionDate}>
                {new Date(sub.submittedAt).toLocaleDateString('en-CA', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </div>
              <button className={styles.smallBtn}>Review</button>
            </div>
          ))
        )}
      </div>

      {/* Recently Reviewed */}
      <div className={styles.dashCard}>
        <h3 className={styles.cardTitle}>📝 Recent {ctx.subjectName} Submissions</h3>

        {reviewed.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📝</div>
            <div className={styles.emptyTitle}>No submissions yet</div>
            <div className={styles.emptyDesc}>Student {ctx.subjectName} submissions will appear here as they complete activities.</div>
          </div>
        ) : (
          reviewed.map((sub) => (
            <div key={sub.id} className={styles.submissionItem}>
              <div className={styles.attentionAvatar}>
                {sub.studentName.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className={styles.submissionInfo}>
                <div className={styles.submissionStudent}>{sub.studentName}</div>
                <div className={styles.submissionActivity}>
                  {sub.activityTitle} · {sub.activityType.charAt(0) + sub.activityType.slice(1).toLowerCase()}
                </div>
              </div>
              {sub.score !== null && sub.maxScore !== null && (
                <div className={styles.submissionScore}>
                  {sub.score}/{sub.maxScore}
                </div>
              )}
              <span className={`${styles.reviewBadge} ${styles.reviewDone}`}>
                Reviewed
              </span>
              <div className={styles.submissionDate}>
                {new Date(sub.submittedAt).toLocaleDateString('en-CA', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

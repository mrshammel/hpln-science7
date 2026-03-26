// ============================================
// Student Review Page — Home Plus LMS
// ============================================
// Dedicated page for reviewing skills that need reinforcement.
// Shows due today, overdue, recently completed, and weakest skills.

import Link from 'next/link';
import { getStudentDashboardData } from '@/lib/student-data';
import styles from '../student.module.css';

function getMasteryColor(state: string): string {
  switch (state) {
    case 'MASTERED': return '#059669';
    case 'DEVELOPING': case 'PRACTICING': return '#3b82f6';
    case 'REVIEW_DUE': return '#f59e0b';
    case 'NEEDS_SUPPORT': return '#ef4444';
    default: return '#94a3b8';
  }
}

function getMasteryBg(state: string): string {
  switch (state) {
    case 'MASTERED': return '#d1fae5';
    case 'DEVELOPING': case 'PRACTICING': return '#dbeafe';
    case 'REVIEW_DUE': return '#fef3c7';
    case 'NEEDS_SUPPORT': return '#fee2e2';
    default: return '#f1f5f9';
  }
}

function getMasteryLabel(state: string): string {
  switch (state) {
    case 'MASTERED': return 'Mastered';
    case 'DEVELOPING': return 'Developing';
    case 'PRACTICING': return 'Practicing';
    case 'REVIEW_DUE': return 'Review Due';
    case 'NEEDS_SUPPORT': return 'Needs Support';
    default: return 'Not Started';
  }
}

export default async function ReviewPage() {
  const data = await getStudentDashboardData();
  const { masterySummary } = data;

  const totalTracked = masterySummary.masteredCount + masterySummary.developingCount + masterySummary.reviewDueCount + masterySummary.needsSupportCount;

  return (
    <>
      <section className={styles.welcomeSection}>
        <h2 className={styles.welcomeTitle}>🔄 Review</h2>
        <p className={styles.welcomeSubtext}>Strengthen your skills with spaced review practice</p>
      </section>

      {/* Review Stats */}
      <section className={styles.statRow} style={{ marginBottom: 24 }}>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: '#d97706' }}>{masterySummary.reviewDueCount}</div>
          <div className={styles.statLabel}>Skills to Review</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: '#dc2626' }}>{masterySummary.needsSupportCount}</div>
          <div className={styles.statLabel}>Need Support</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: '#059669' }}>{masterySummary.reviewCompletedToday}</div>
          <div className={styles.statLabel}>Done Today</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: '#059669' }}>
            {totalTracked > 0 ? `${Math.round((masterySummary.masteredCount / totalTracked) * 100)}%` : '—'}
          </div>
          <div className={styles.statLabel}>Mastery Rate</div>
        </div>
      </section>

      {/* Mastery Overview */}
      {totalTracked > 0 && (
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
              const pct = (n: number) => totalTracked > 0 ? `${Math.round((n / totalTracked) * 100)}%` : '0%';
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

      {/* Skills needing review */}
      <div className={styles.dashGrid}>
        {/* Due for Review */}
        <section className={styles.dashCard} aria-label="Skills due for review">
          <h3 className={styles.cardTitle}>
            🔄 Due for Review
            {masterySummary.reviewDueSkills.length > 0 && (
              <span className={styles.cardSubtext}>{masterySummary.reviewDueSkills.length} skill{masterySummary.reviewDueSkills.length !== 1 ? 's' : ''}</span>
            )}
          </h3>
          {masterySummary.reviewDueSkills.length > 0 ? (
            masterySummary.reviewDueSkills.map((skill) => (
              <div key={skill.id} className={styles.skillItem}>
                <span className={styles.skillItemDot} style={{ background: getMasteryColor(skill.masteryState) }} />
                <span className={styles.skillItemName}>{skill.title}</span>
                <span
                  className={styles.skillItemScore}
                  style={{ background: getMasteryBg(skill.masteryState), color: getMasteryColor(skill.masteryState) }}
                >
                  {getMasteryLabel(skill.masteryState)}
                </span>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>✅</div>
              <div className={styles.emptyText}>No skills due for review — great job!</div>
            </div>
          )}
        </section>

        {/* Weakest Skills */}
        <section className={styles.dashCard} aria-label="Weakest skills">
          <h3 className={styles.cardTitle}>
            📌 Weakest Skills
            {masterySummary.weakestSkills.length > 0 && (
              <span className={styles.cardSubtext}>Focus here</span>
            )}
          </h3>
          {masterySummary.weakestSkills.length > 0 ? (
            masterySummary.weakestSkills.map((skill) => (
              <div key={skill.id} className={styles.skillItem}>
                <span className={styles.skillItemDot} style={{ background: getMasteryColor(skill.masteryState) }} />
                <span className={styles.skillItemName}>{skill.title}</span>
                <span
                  className={styles.skillItemScore}
                  style={{ background: getMasteryBg(skill.masteryState), color: getMasteryColor(skill.masteryState) }}
                >
                  {Math.round(skill.masteryScore * 100)}%
                </span>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>💪</div>
              <div className={styles.emptyText}>All skills are strong — keep it up!</div>
            </div>
          )}
        </section>

        {/* Strongest Skills */}
        <section className={styles.dashCard} aria-label="Strongest skills">
          <h3 className={styles.cardTitle}>
            💪 Strongest Skills
            {masterySummary.strongestSkills.length > 0 && (
              <span className={styles.cardSubtext}>Well done!</span>
            )}
          </h3>
          {masterySummary.strongestSkills.length > 0 ? (
            masterySummary.strongestSkills.map((skill) => (
              <div key={skill.id} className={styles.skillItem}>
                <span className={styles.skillItemDot} style={{ background: getMasteryColor(skill.masteryState) }} />
                <span className={styles.skillItemName}>{skill.title}</span>
                <span
                  className={styles.skillItemScore}
                  style={{ background: getMasteryBg(skill.masteryState), color: getMasteryColor(skill.masteryState) }}
                >
                  {Math.round(skill.masteryScore * 100)}%
                </span>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📚</div>
              <div className={styles.emptyText}>Complete lessons to build your strengths!</div>
            </div>
          )}
        </section>
      </div>

      {/* Coming Soon notice */}
      <section className={styles.dashCard} style={{ textAlign: 'center', padding: '32px 24px', marginTop: 8 }}>
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>🚀</div>
        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1a2137', marginBottom: 4 }}>
          Interactive Review Coming Soon
        </div>
        <div style={{ fontSize: '0.84rem', color: '#64748b' }}>
          Soon you&apos;ll be able to practice review questions right here to strengthen your skills.
          For now, revisit your lessons to practice!
        </div>
        <Link
          href="/student/courses"
          style={{
            display: 'inline-block',
            marginTop: 16,
            padding: '10px 24px',
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            color: '#fff',
            fontSize: '0.85rem',
            fontWeight: 700,
            borderRadius: 12,
            textDecoration: 'none',
          }}
        >
          Go to My Courses →
        </Link>
      </section>
    </>
  );
}

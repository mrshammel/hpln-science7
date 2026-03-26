import styles from '../student.module.css';
import { getStudentDashboardData } from '@/lib/student-data';

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

export default async function GradesPage() {
  const data = await getStudentDashboardData();
  const { enrollments, masterySummary, stats } = data;

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
          <div className={styles.statValue} style={{ color: '#059669' }}>
            {masterySummary.totalSkills > 0
              ? `${Math.round((masterySummary.masteredCount / masterySummary.totalSkills) * 100)}%`
              : '—'}
          </div>
          <div className={styles.statLabel}>Mastery</div>
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
                <div className={styles.courseDetailStatLabel}>Mastery</div>
                <div className={styles.courseDetailStatValue} style={{ color: '#059669' }}>
                  {course.mastery.totalSkills > 0
                    ? `${course.mastery.masteredSkills}/${course.mastery.totalSkills}`
                    : '—'}
                </div>
                <div className={styles.courseDetailStatNote}>
                  {course.mastery.totalSkills > 0 ? 'skills mastered' : 'No skills'}
                </div>
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

      {/* Mastery Context section */}
      {(masterySummary.strongestSkills.length > 0 || masterySummary.weakestSkills.length > 0 || masterySummary.reviewDueSkills.length > 0) && (
        <section className={styles.masteryContext} id="mastery-context">
          <h3 className={styles.masteryContextTitle}>🧠 Mastery Context</h3>
          <div className={styles.masteryContextGrid}>
            {/* Strongest Skills */}
            <div className={styles.masteryContextColumn}>
              <div className={styles.masteryContextColumnTitle} style={{ color: '#059669', borderColor: '#059669' }}>
                💪 Strongest Skills
              </div>
              {masterySummary.strongestSkills.length > 0 ? (
                masterySummary.strongestSkills.map((skill) => (
                  <div key={skill.id} className={styles.skillItem}>
                    <span className={styles.skillItemDot} style={{ background: getMasteryColor(skill.masteryState) }} />
                    <span className={styles.skillItemName}>{skill.title}</span>
                    <span className={styles.skillItemScore} style={{ background: getMasteryBg(skill.masteryState), color: getMasteryColor(skill.masteryState) }}>
                      {Math.round(skill.masteryScore * 100)}%
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', padding: '8px 10px' }}>
                  Keep working — your strengths will show!
                </div>
              )}
            </div>

            {/* Weakest Skills */}
            <div className={styles.masteryContextColumn}>
              <div className={styles.masteryContextColumnTitle} style={{ color: '#dc2626', borderColor: '#ef4444' }}>
                📌 Needs Work
              </div>
              {masterySummary.weakestSkills.length > 0 ? (
                masterySummary.weakestSkills.map((skill) => (
                  <div key={skill.id} className={styles.skillItem}>
                    <span className={styles.skillItemDot} style={{ background: getMasteryColor(skill.masteryState) }} />
                    <span className={styles.skillItemName}>{skill.title}</span>
                    <span className={styles.skillItemScore} style={{ background: getMasteryBg(skill.masteryState), color: getMasteryColor(skill.masteryState) }}>
                      {Math.round(skill.masteryScore * 100)}%
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', padding: '8px 10px' }}>
                  No weak skills — great job! 🎉
                </div>
              )}
            </div>

            {/* Review Due */}
            <div className={styles.masteryContextColumn}>
              <div className={styles.masteryContextColumnTitle} style={{ color: '#d97706', borderColor: '#f59e0b' }}>
                🔄 Needs Review
              </div>
              {masterySummary.reviewDueSkills.length > 0 ? (
                masterySummary.reviewDueSkills.map((skill) => (
                  <div key={skill.id} className={styles.skillItem}>
                    <span className={styles.skillItemDot} style={{ background: getMasteryColor(skill.masteryState) }} />
                    <span className={styles.skillItemName}>{skill.title}</span>
                    <span className={styles.skillItemScore} style={{ background: getMasteryBg(skill.masteryState), color: getMasteryColor(skill.masteryState) }}>
                      {Math.round(skill.masteryScore * 100)}%
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', padding: '8px 10px' }}>
                  Nothing to review right now ✅
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

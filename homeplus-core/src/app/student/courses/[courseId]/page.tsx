// ============================================
// Course Detail Page — Home Plus LMS
// ============================================
// Redesigned with large visual unit cards,
// subject-colored header, and hero continue card.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCourseDetail } from '@/lib/course-detail-data';
import { getUnitStateUI } from '@/lib/unit-progress';
import { subjectColorVars } from '@/lib/subject-colors';
import styles from '../../student.module.css';

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function CourseDetailPage({ params }: Props) {
  const { courseId } = await params;
  const course = await getCourseDetail(courseId);

  if (!course) notFound();

  const {
    subjectName, subjectIcon, gradeLevel,
    progressPercent, completedLessons, totalLessons,
    averageScore, missingAssignments,
    currentUnit, currentLesson,
    nextLessonId, nextUnitId,
    units,
  } = course;

  return (
    <div style={subjectColorVars(subjectName)}>
      {/* ===== BREADCRUMB ===== */}
      <div className={styles.breadcrumb}>
        <Link href="/student/courses" className={styles.breadcrumbLink}>My Courses</Link>
        <span className={styles.breadcrumbSep}>›</span>
        <span className={styles.breadcrumbCurrent}>{subjectName}</span>
      </div>

      {/* ===== COURSE HEADER ===== */}
      <section className={styles.welcomeSection} aria-label="Course header">
        <div className={styles.welcomeRow}>
          <div className={styles.continueIcon}>
            <span>{subjectIcon}</span>
          </div>
          <div>
            <h2 className={styles.welcomeTitle}>{subjectName}</h2>
            <p className={styles.welcomeSubtext}>Grade {gradeLevel}</p>
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className={styles.statRow} aria-label="Course stats">
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: 'var(--subject-primary)' }}>{progressPercent}%</div>
          <div className={styles.statLabel}>Progress</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: averageScore != null && averageScore >= 75 ? '#059669' : '#d97706' }}>
            {averageScore != null ? `${averageScore}%` : '—'}
          </div>
          <div className={styles.statLabel}>My Grade</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: '#475569' }}>{completedLessons}/{totalLessons}</div>
          <div className={styles.statLabel}>Lessons Done</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: missingAssignments > 0 ? '#dc2626' : '#059669' }}>
            {missingAssignments > 0 ? missingAssignments : '✅'}
          </div>
          <div className={styles.statLabel}>{missingAssignments > 0 ? 'Missing' : 'All Done'}</div>
        </div>
      </section>

      {/* ===== HERO CONTINUE ===== */}
      {currentLesson && nextLessonId && nextUnitId && (
        <Link
          href={`/student/courses/${course.subjectId}/units/${nextUnitId}/lessons/${nextLessonId}`}
          className={styles.heroCard}
          aria-label="Continue learning"
        >
          <div className={styles.heroIcon}>{subjectIcon}</div>
          <div className={styles.heroInfo}>
            <div className={styles.heroLabel}>▶ Continue Learning</div>
            <div className={styles.heroTitle}>{currentUnit}</div>
            <div className={styles.heroSubtitle}>{currentLesson}</div>
            <div className={styles.heroProgress}>
              <div className={styles.heroProgressBar}>
                <div className={styles.heroProgressFill} style={{ width: `${progressPercent}%` }} />
              </div>
              <span className={styles.heroProgressText}>{progressPercent}%</span>
            </div>
          </div>
          <span className={styles.heroBtn}>Continue →</span>
        </Link>
      )}

      {/* ===== UNIT CARDS ===== */}
      <section aria-label="Course units">
        <h3 className={styles.sectionHeading}>📚 Units</h3>
        <div className={styles.unitCardGrid}>
          {units.map((unit) => {
            const ui = getUnitStateUI(unit.unitDisplayState);
            const isLocked = unit.unitDisplayState === 'LOCKED';
            const isComplete = unit.unitDisplayState === 'COMPLETED' || unit.unitDisplayState === 'EXEMPT';

            const statusClass = isComplete ? styles.statusComplete
              : unit.unitDisplayState === 'IN_PROGRESS' ? styles.statusInProgress
              : isLocked ? styles.statusLocked
              : styles.statusAvailable;

            const ctaLabel = isLocked ? '🔒 Locked'
              : isComplete ? 'Review →'
              : unit.unitDisplayState === 'IN_PROGRESS' ? 'Continue →'
              : 'Start Unit →';

            const CardInner = (
              <div className={`${styles.unitCard} ${isLocked ? styles.unitCardLocked : ''}`}>
                {unit.isNextUnit && (
                  <div className={styles.nextBadge}>▶ UP NEXT</div>
                )}
                <div className={styles.unitCardBand} />
                <div className={styles.unitCardBody}>
                  <div className={styles.unitCardHeader}>
                    <div className={styles.unitCardIconWrap}>
                      {isLocked ? '🔒' : isComplete ? '✅' : (unit.icon || '📖')}
                    </div>
                    <div className={styles.unitCardTitleGroup}>
                      <div className={styles.unitCardLabel}>
                        Unit {unit.order + 1}
                      </div>
                      <h4 className={styles.unitCardTitle}>{unit.title}</h4>
                    </div>
                    <span className={`${styles.statusChip} ${statusClass}`}>
                      {ui.badge}
                    </span>
                  </div>

                  {unit.description && (
                    <div className={styles.unitCardDesc}>{unit.description}</div>
                  )}

                  <div className={styles.unitCardMeta}>
                    <span className={styles.unitCardMetaItem}>📖 {unit.totalLessons} lessons</span>
                  </div>

                  {!isLocked && (
                    <div className={styles.unitCardProgressWrap}>
                      <div className={styles.progressBar} style={{ width: '100%', height: 8 }}>
                        <div className={styles.progressFill} style={{
                          width: `${unit.progressPercent}%`,
                          background: isComplete ? '#059669' : undefined,
                        }} />
                      </div>
                      <div className={styles.courseCardProgressRow}>
                        <span>{unit.completedLessons}/{unit.totalLessons} done</span>
                        <span className={styles.progressPercent}>{unit.progressPercent}%</span>
                      </div>
                    </div>
                  )}

                  {isLocked ? (
                    <div className={styles.unitCardCta} style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                      🔒 Locked
                    </div>
                  ) : (
                    <div className={styles.unitCardCta}>
                      {ctaLabel}
                    </div>
                  )}
                </div>
              </div>
            );

            if (isLocked) {
              return <div key={unit.id}>{CardInner}</div>;
            }

            return (
              <Link
                key={unit.id}
                href={`/student/courses/${course.subjectId}/units/${unit.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                {CardInner}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

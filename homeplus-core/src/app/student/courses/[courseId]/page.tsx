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
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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

  // Fetch mastery data for this course
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  let courseMastery = { masteredSkills: 0, developingSkills: 0, reviewDue: 0, needsSupport: 0, totalSkills: 0 };
  if (userId) {
    const cms = await prisma.courseMasterySummary.findUnique({
      where: { studentId_subjectId: { studentId: userId, subjectId: courseId } },
    });
    if (cms) {
      courseMastery = {
        masteredSkills: cms.masteredSkills,
        developingSkills: cms.developingSkills,
        reviewDue: cms.reviewDue,
        needsSupport: cms.needsSupport,
        totalSkills: cms.totalSkills,
      };
    }
  } else {
    // Demo mastery data
    if (courseId === 'sci-7') courseMastery = { masteredSkills: 4, developingSkills: 2, reviewDue: 1, needsSupport: 0, totalSkills: 7 };
    else if (courseId === 'math-7') courseMastery = { masteredSkills: 5, developingSkills: 1, reviewDue: 0, needsSupport: 0, totalSkills: 6 };
    else if (courseId === 'ela-7') courseMastery = { masteredSkills: 2, developingSkills: 2, reviewDue: 0, needsSupport: 1, totalSkills: 5 };
  }

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
          <div className={styles.statValue} style={{ color: '#059669' }}>
            {courseMastery.totalSkills > 0
              ? `${Math.round((courseMastery.masteredSkills / courseMastery.totalSkills) * 100)}%`
              : '—'}
          </div>
          <div className={styles.statLabel}>Mastery</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: '#475569' }}>{completedLessons}/{totalLessons}</div>
          <div className={styles.statLabel}>Lessons Done</div>
        </div>
      </section>

      {/* ===== MASTERY STRIP ===== */}
      {courseMastery.totalSkills > 0 && (
        <section className={styles.masteryWidget} aria-label="Course mastery" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 className={styles.masteryWidgetTitle} style={{ margin: 0 }}>🧠 Skill Mastery</h3>
            {courseMastery.reviewDue > 0 && (
              <Link href="/student/review" className={styles.reviewDueBadge} style={{ textDecoration: 'none' }}>
                🔄 {courseMastery.reviewDue} review due
              </Link>
            )}
          </div>
          <div className={styles.courseMasteryStrip} style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
            <span className={styles.masteryDot}>
              <span className={styles.masteryDotCircle} style={{ background: '#059669' }} />
              {courseMastery.masteredSkills} Mastered
            </span>
            <span className={styles.masteryDot}>
              <span className={styles.masteryDotCircle} style={{ background: '#3b82f6' }} />
              {courseMastery.developingSkills} Developing
            </span>
            {courseMastery.reviewDue > 0 && (
              <span className={styles.masteryDot}>
                <span className={styles.masteryDotCircle} style={{ background: '#f59e0b' }} />
                {courseMastery.reviewDue} Review
              </span>
            )}
            {courseMastery.needsSupport > 0 && (
              <span className={styles.masteryDot}>
                <span className={styles.masteryDotCircle} style={{ background: '#ef4444' }} />
                {courseMastery.needsSupport} Support
              </span>
            )}
          </div>
        </section>
      )}

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

// ============================================
// Student Unit Detail Page — Home Plus LMS
// ============================================
// Two-column layout: left sidebar lesson nav + main content.
// Shows unit overview, learning framing, and lesson cards
// with subject-aware gating (locked/available/mastered, etc.)

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getUnitDetail } from '@/lib/unit-detail-data';
import { getLessonStateUI } from '@/lib/lesson-progress';
import { subjectColorVars } from '@/lib/subject-colors';
import styles from '../../../../student.module.css';

interface Props {
  params: Promise<{ courseId: string; unitId: string }>;
}

export default async function UnitDetailPage({ params }: Props) {
  const { courseId, unitId } = await params;
  const unit = await getUnitDetail(courseId, unitId);

  if (!unit) {
    notFound();
  }

  const {
    courseName, courseIcon, gradeLevel, subjectMode,
    unitTitle, unitDescription, unitIcon, unitOrder,
    totalLessons, completedLessons, progressPercent, unitStatus,
    nextLessonId, nextLessonTitle,
    lessons, learningTargets, successCriteria, keyVocabulary,
  } = unit;

  const statusColor = unitStatus === 'completed' ? '#059669' : unitStatus === 'in-progress' ? 'var(--subject-primary)' : '#94a3b8';
  const statusClass = unitStatus === 'completed' ? styles.statusComplete : unitStatus === 'in-progress' ? styles.statusInProgress : styles.statusLocked;
  const statusLabel = unitStatus === 'completed' ? '✅ Complete' : unitStatus === 'in-progress' ? '📝 In Progress' : '⬜ Not Started';

  const unlockHint =
    subjectMode === 'SCIENCE' ? 'Mastery (80%+) required to unlock the next lesson.'
    : subjectMode === 'MATH' ? 'Complete or master each lesson to unlock the next.'
    : 'Complete each lesson to unlock the next one.';

  return (
    <div style={subjectColorVars(courseName)}>
      {/* ===== BREADCRUMB ===== */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/student/courses" className={styles.breadcrumbLink}>My Courses</Link>
        <span className={styles.breadcrumbSep}>›</span>
        <Link href={`/student/courses/${courseId}`} className={styles.breadcrumbLink}>
          {courseIcon} {courseName}
        </Link>
        <span className={styles.breadcrumbSep}>›</span>
        <span className={styles.breadcrumbCurrent}>{unitIcon} Unit {unitOrder + 1}</span>
      </nav>

      {/* ===== UNIT HEADER ===== */}
      <section className={styles.welcomeSection} aria-label="Unit header">
        <div className={styles.welcomeRow}>
          <div className={styles.continueIcon} style={{ fontSize: '1.5rem' }}>
            <span>{unitIcon || '📖'}</span>
          </div>
          <div style={{ flex: 1 }}>
            <h2 className={styles.welcomeTitle}>{unitTitle}</h2>
            <p className={styles.welcomeSubtext}>Grade {gradeLevel} · {courseName}</p>
          </div>
          <span className={`${styles.statusChip} ${statusClass}`} style={{ alignSelf: 'flex-start' }}>
            {statusLabel}
          </span>
        </div>
        {unitDescription && (
          <p style={{ fontSize: '0.88rem', color: '#5c6478', lineHeight: 1.6, marginTop: 10 }}>
            {unitDescription}
          </p>
        )}
      </section>

      {/* ===== HERO CONTINUE ===== */}
      {nextLessonTitle && nextLessonId && unitStatus !== 'completed' && (
        <Link
          href={`/student/courses/${courseId}/units/${unitId}/lessons/${nextLessonId}`}
          className={styles.heroCard}
          aria-label="Continue to next lesson"
        >
          <div className={styles.heroIcon}>{unitIcon || '📖'}</div>
          <div className={styles.heroInfo}>
            <div className={styles.heroLabel}>▶ {completedLessons === 0 ? 'Start Learning' : 'Continue Learning'}</div>
            <div className={styles.heroTitle}>{nextLessonTitle}</div>
            <div className={styles.heroProgress}>
              <div className={styles.heroProgressBar}>
                <div className={styles.heroProgressFill} style={{ width: `${progressPercent}%` }} />
              </div>
              <span className={styles.heroProgressText}>{completedLessons}/{totalLessons} lessons</span>
            </div>
          </div>
          <span className={styles.heroBtn}>
            {completedLessons === 0 ? 'Start →' : 'Continue →'}
          </span>
        </Link>
      )}

      {/* ===== TWO-COLUMN LAYOUT ===== */}
      <div className={styles.unitPageLayout}>

        {/* --- LEFT SIDEBAR: Lesson Navigator --- */}
        <aside className={styles.lessonSidebar}>
          <div className={styles.lessonSidebarTitle}>Lessons</div>
          <ol className={styles.lessonSidebarList}>
            {lessons.map((lesson, i) => {
              const ui = getLessonStateUI(lesson.displayState);
              const isLocked = lesson.displayState === 'LOCKED';
              const isComplete = lesson.displayState === 'MASTERED' || lesson.displayState === 'COMPLETED';
              const isCurrent = lesson.isNextLesson;

              const numClass = isComplete ? styles.lessonSidebarNumComplete
                : isCurrent ? styles.lessonSidebarNumActive
                : isLocked ? styles.lessonSidebarNumLocked
                : '';

              const itemClass = `${styles.lessonSidebarItem} ${
                isCurrent ? styles.lessonSidebarItemActive
                : isComplete ? styles.lessonSidebarItemComplete
                : isLocked ? styles.lessonSidebarItemLocked
                : ''
              }`;

              const inner = (
                <>
                  <span className={`${styles.lessonSidebarNum} ${numClass}`}>
                    {isComplete ? '✓' : isLocked ? '🔒' : i + 1}
                  </span>
                  <span className={styles.lessonSidebarItemLabel}>{lesson.title}</span>
                </>
              );

              if (isLocked) {
                return (
                  <li key={lesson.id}>
                    <div className={itemClass} title="Locked">{inner}</div>
                  </li>
                );
              }

              return (
                <li key={lesson.id}>
                  <Link
                    href={`/student/courses/${courseId}/units/${unitId}/lessons/${lesson.id}`}
                    className={itemClass}
                  >
                    {inner}
                  </Link>
                </li>
              );
            })}
          </ol>

          {/* Unlock hint */}
          <div style={{ padding: '12px 20px 0', fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
            {unlockHint}
          </div>
        </aside>

        {/* --- RIGHT: Main Content --- */}
        <div className={styles.unitMainContent}>

          {/* Stats row */}
          <section className={styles.statRow} aria-label="Unit stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className={styles.statCard}>
              <div className={styles.statValue} style={{ color: 'var(--subject-primary)' }}>{progressPercent}%</div>
              <div className={styles.statLabel}>Progress</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue} style={{ color: '#475569' }}>{completedLessons}/{totalLessons}</div>
              <div className={styles.statLabel}>Lessons Done</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue} style={{ color: statusColor }}>
                {unitStatus === 'completed' ? '✅' : unitStatus === 'in-progress' ? '📝' : '⬜'}
              </div>
              <div className={styles.statLabel}>
                {unitStatus === 'completed' ? 'Complete!' : unitStatus === 'in-progress' ? 'In Progress' : 'Not Started'}
              </div>
            </div>
          </section>

          {/* Learning targets */}
          {learningTargets.length > 0 && (
            <section className={styles.dashCard} style={{ marginBottom: 20 }} aria-label="Learning targets">
              <h3 className={styles.cardTitle}>🎯 Learning Targets</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 10 }}>
                By the end of this unit, you should be able to say:
              </p>
              <ul className={styles.targetList}>
                {learningTargets.map((t, i) => (
                  <li key={i} className={styles.targetItem}>{t}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Success criteria */}
          {successCriteria.length > 0 && (
            <section className={styles.dashCard} style={{ marginBottom: 20 }} aria-label="Success criteria">
              <h3 className={styles.cardTitle}>✅ Success Criteria</h3>
              <ul className={styles.targetList}>
                {successCriteria.map((s, i) => (
                  <li key={i} className={styles.criteriaItem}>{s}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Key vocabulary */}
          {keyVocabulary.length > 0 && (
            <section className={styles.dashCard} style={{ marginBottom: 20 }} aria-label="Key vocabulary">
              <h3 className={styles.cardTitle}>📖 Key Vocabulary</h3>
              <div className={styles.vocabGrid}>
                {keyVocabulary.map((v, i) => (
                  <div key={i} className={styles.vocabCard}>
                    <div className={styles.vocabTerm}>{v.term}</div>
                    <div className={styles.vocabDef}>{v.definition}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ===== LESSON CARDS ===== */}
          <section aria-label="Unit lessons">
            <h3 className={styles.sectionHeading}>📚 Lessons</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {lessons.map((lesson, i) => {
                const ui = getLessonStateUI(lesson.displayState);
                const isLocked = lesson.displayState === 'LOCKED';
                const isNext = lesson.isNextLesson;
                const isComplete = lesson.displayState === 'MASTERED' || lesson.displayState === 'COMPLETED';

                const statusCls = isComplete ? styles.statusComplete
                  : lesson.displayState === 'IN_PROGRESS' || lesson.displayState === 'AVAILABLE' ? styles.statusInProgress
                  : lesson.displayState === 'NEEDS_RETEACH' ? styles.statusReview
                  : styles.statusLocked;

                const CardContent = (
                  <div className={`${styles.lessonCard} ${isLocked ? styles.lessonCardLocked : ''}`}>
                    {isNext && <div className={styles.nextBadge}>▶ NEXT</div>}

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      {/* Lesson number */}
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: isLocked ? '#e2e8f0' : isComplete ? '#059669' : 'var(--subject-primary)',
                        color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
                      }}>
                        {lesson.displayState === 'MASTERED' ? '⭐'
                          : isComplete ? '✓'
                          : isLocked ? '🔒'
                          : i + 1}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                          <h4 style={{
                            fontSize: '1rem', fontWeight: 700, margin: 0,
                            color: isLocked ? '#94a3b8' : isComplete ? '#059669' : '#1a2137',
                          }}>
                            {lesson.title}
                          </h4>
                          <span className={`${styles.statusChip} ${statusCls}`}>
                            {ui.badge}
                          </span>
                        </div>

                        {lesson.subtitle && (
                          <p style={{ fontSize: '0.84rem', color: isLocked ? '#cbd5e1' : '#5c6478', margin: '4px 0 0', lineHeight: 1.5 }}>
                            {lesson.subtitle}
                          </p>
                        )}

                        {/* Mastery score */}
                        {lesson.masteryScore != null && isComplete && (
                          <p style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600, margin: '4px 0 0' }}>
                            ⭐ Score: {Math.round(lesson.masteryScore)}%
                          </p>
                        )}

                        {lesson.displayState === 'NEEDS_RETEACH' && (
                          <p style={{ fontSize: '0.78rem', color: '#d97706', fontWeight: 600, margin: '4px 0 0' }}>
                            ⚠️ Complete the review to continue.
                          </p>
                        )}

                        {/* Activity pills */}
                        {!isLocked && lesson.activities.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                            {lesson.activities.map((act) => {
                              const typeIcon = act.type === 'QUIZ' ? '📝' : act.type === 'ASSIGNMENT' ? '📄' : act.type === 'REFLECTION' ? '🪞' : '🔬';
                              return (
                                <span
                                  key={act.id}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    fontSize: '0.74rem', padding: '3px 10px',
                                    borderRadius: 8,
                                    background: act.submitted ? '#d1fae5' : '#f8f9fb',
                                    color: act.submitted ? '#059669' : '#5c6478',
                                    border: `1px solid ${act.submitted ? '#86efac' : '#e8ecf1'}`,
                                  }}
                                >
                                  {typeIcon} {act.title}
                                  {act.submitted && act.score != null && ` · ${act.score}/${act.maxScore}`}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* CTA */}
                        {!isLocked && ui.cta && (
                          <div style={{ marginTop: 12 }}>
                            <span className={styles.lessonCta} style={{
                              color: isComplete ? '#059669' : 'var(--subject-primary)',
                              borderColor: lesson.displayState === 'NEEDS_RETEACH' ? '#fbbf24'
                                : isComplete ? '#86efac'
                                : 'var(--subject-light)',
                            }}>
                              {ui.cta}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );

                if (isLocked) {
                  return <div key={lesson.id}>{CardContent}</div>;
                }

                return (
                  <Link
                    key={lesson.id}
                    href={`/student/courses/${courseId}/units/${unitId}/lessons/${lesson.id}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    {CardContent}
                  </Link>
                );
              })}
            </div>
          </section>

          {/* ===== UNIT COMPLETE BANNER ===== */}
          {unitStatus === 'completed' && (
            <section
              className={styles.dashCard}
              style={{ marginTop: 24, background: '#f0fdf4', borderLeft: '5px solid #059669', textAlign: 'center', padding: '28px 24px' }}
              aria-label="Unit complete"
            >
              <div style={{ fontSize: '2.4rem', marginBottom: 8 }}>🎉</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669', margin: '0 0 6px' }}>
                Unit Complete! 🌟
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#475569' }}>
                You&apos;ve finished all lessons in {unitTitle}. Great work!
              </p>
              <Link
                href={`/student/courses/${courseId}`}
                className={styles.continueBtn}
                style={{ display: 'inline-block', marginTop: 14 }}
              >
                ← Back to Course
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

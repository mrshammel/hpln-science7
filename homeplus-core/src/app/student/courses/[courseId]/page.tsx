// ============================================
// Student Course Detail Page — Home Plus LMS
// ============================================
// Dynamic route: /student/courses/[courseId]
// Shows course overview, progress, and all units.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCourseDetail } from '@/lib/course-detail-data';
import { getUnitStateUI } from '@/lib/unit-progress';
import styles from '../../student.module.css';

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function CourseDetailPage({ params }: Props) {
  const { courseId } = await params;
  const course = await getCourseDetail(courseId);

  if (!course) {
    notFound();
  }

  const {
    subjectName, subjectIcon, gradeLevel, progressPercent,
    completedLessons, totalLessons, averageScore, gradeLabel,
    pacing, pacingStyle, currentUnit, currentLesson,
    missingAssignments, units,
  } = course;

  return (
    <>
      {/* ===== A. COURSE HEADER ===== */}
      <section className={styles.welcomeSection} aria-label="Course header">
        <Link href="/student/courses" style={{ fontSize: '0.82rem', color: '#94a3b8', textDecoration: 'none', marginBottom: 8, display: 'inline-block' }}>
          ← All Courses
        </Link>
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

      {/* ===== B. COURSE SUMMARY ===== */}
      <section className={styles.statRow} aria-label="Course summary statistics">
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: '#2563eb' }}>{progressPercent}%</div>
          <div className={styles.statLabel}>Progress</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: averageScore != null && averageScore >= 75 ? '#059669' : '#d97706' }}>
            {averageScore != null ? `${averageScore}%` : '—'}
          </div>
          <div className={styles.statLabel}>Grade · {gradeLabel}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: '#475569' }}>{completedLessons}/{totalLessons}</div>
          <div className={styles.statLabel}>Lessons Done</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: pacingStyle.color }}>{pacing.academicLabel}</div>
          <div className={styles.statLabel}>Pacing</div>
        </div>
      </section>

      {/* ===== C. CONTINUE LEARNING ===== */}
      {currentLesson && (
        <section className={`${styles.dashCard} ${styles.dashCardFull}`} style={{ marginBottom: 24, borderLeft: `4px solid #2563eb` }} aria-label="Continue learning">
          <div className={styles.continueCard}>
            <div className={styles.continueInfo}>
              <div className={styles.continueCourse}>Continue Learning</div>
              <div className={styles.continueUnit}>{currentUnit}</div>
              <div className={styles.continueLesson}>{currentLesson}</div>
              <div className={styles.continueProgress}>
                <div className={styles.progressBar} style={{ width: 140, height: 6 }}>
                  <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
                </div>
                <span className={styles.progressPercent}>{progressPercent}%</span>
              </div>
            </div>
            <span className={styles.continueBtn}>Continue →</span>
          </div>
        </section>
      )}

      {/* ===== D. PACING BAR ===== */}
      <section className={`${styles.dashCard} ${styles.dashCardFull}`} style={{ marginBottom: 24 }} aria-label="Pacing overview">
        <h3 className={styles.cardTitle}>
          📈 Pacing Overview
          <span className={styles.cardSubtext}>
            <span
              className={styles.pacingBadge}
              style={{ background: pacingStyle.bg, color: pacingStyle.color }}
            >
              {pacingStyle.icon} {pacing.academicLabel}
            </span>
          </span>
        </h3>
        <div className={styles.pacingBar}>
          <div className={styles.pacingBarLabel}>
            <span>Expected: {Math.round(pacing.expectedProgress)}%</span>
            <span>Actual: {Math.round(pacing.actualProgress)}%</span>
          </div>
          <div className={styles.pacingBarTrack}>
            <div className={styles.pacingBarExpected} style={{ width: `${pacing.expectedProgress}%` }} />
            <div className={styles.pacingBarActual} style={{ width: `${pacing.actualProgress}%` }} />
          </div>
        </div>
        {missingAssignments > 0 && (
          <div className={styles.missingBadge}>
            ⚠️ {missingAssignments} missing assignment{missingAssignments > 1 ? 's' : ''}
          </div>
        )}
      </section>

      {/* ===== E. ALL UNITS (with gating) ===== */}
      <section aria-label="Course units">
        <h3 className={styles.sectionHeading} style={{ marginBottom: 16 }}>📋 Units</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {units.map((unit) => {
            const ui = getUnitStateUI(unit.unitDisplayState);
            const isLocked = unit.unitDisplayState === 'LOCKED';

            const borderColor = unit.isNextUnit ? '#2563eb'
              : unit.unitDisplayState === 'COMPLETED' || unit.unitDisplayState === 'EXEMPT' ? '#059669'
              : unit.unitDisplayState === 'IN_PROGRESS' ? '#2563eb'
              : unit.unitDisplayState === 'AVAILABLE' ? '#93c5fd'
              : '#e2e8f0';

            const CardContent = (
              <div
                className={styles.dashCard}
                style={{
                  borderLeft: `4px solid ${borderColor}`,
                  opacity: isLocked ? 0.55 : 1,
                  cursor: isLocked ? 'default' : 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  position: 'relative' as const,
                }}
              >
                {/* Next unit indicator */}
                {unit.isNextUnit && (
                  <div style={{
                    position: 'absolute' as const, top: -8, right: 12,
                    background: '#2563eb', color: '#fff',
                    fontSize: '0.68rem', fontWeight: 700,
                    padding: '2px 10px', borderRadius: 10,
                  }}>
                    ▶ NEXT
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div className={styles.continueIcon} style={{ width: 42, height: 42, fontSize: '1.2rem' }}>
                    <span>
                      {isLocked ? '🔒' : unit.unitDisplayState === 'COMPLETED' || unit.unitDisplayState === 'EXEMPT' ? '✅' : unit.icon || '📖'}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <h4 style={{
                        fontSize: '0.94rem', fontWeight: 700, margin: 0,
                        color: isLocked ? '#94a3b8' : '#1e293b',
                      }}>
                        {unit.title}
                      </h4>
                      <span
                        className={styles.pacingBadge}
                        style={{ background: ui.bg, color: ui.color }}
                      >
                        {ui.badge}
                      </span>
                    </div>
                    {unit.description && (
                      <p style={{ fontSize: '0.82rem', color: isLocked ? '#cbd5e1' : '#64748b', margin: '4px 0 0' }}>
                        {unit.description}
                      </p>
                    )}

                    {/* Lesson progress bar (only for non-locked) */}
                    {!isLocked && (
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className={styles.progressBar} style={{ flex: 1, height: 6 }}>
                          <div
                            className={styles.progressFill}
                            style={{
                              width: `${unit.progressPercent}%`,
                              background: unit.unitDisplayState === 'COMPLETED' || unit.unitDisplayState === 'EXEMPT' ? '#059669' : undefined,
                            }}
                          />
                        </div>
                        <span style={{
                          fontSize: '0.78rem', fontWeight: 600,
                          color: unit.unitDisplayState === 'COMPLETED' || unit.unitDisplayState === 'EXEMPT' ? '#059669' : '#2563eb',
                          minWidth: 64, textAlign: 'right',
                        }}>
                          {unit.completedLessons}/{unit.totalLessons} lessons
                        </span>
                      </div>
                    )}

                    {/* Locked message */}
                    {isLocked && (
                      <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '6px 0 0', fontStyle: 'italic' }}>
                        Complete the previous unit to unlock
                      </p>
                    )}

                    {/* CTA */}
                    {ui.cta && !isLocked && (
                      <div className={styles.courseCardCta} style={{ textAlign: 'left', marginTop: 10 }}>
                        {ui.cta}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );

            // Locked units get a non-clickable div; clickable units get a Link
            if (isLocked) {
              return <div key={unit.id}>{CardContent}</div>;
            }

            return (
              <Link
                key={unit.id}
                href={`/student/courses/${course.subjectId}/units/${unit.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
                aria-label={`Open ${unit.title}`}
              >
                {CardContent}
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}

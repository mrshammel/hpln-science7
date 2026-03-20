'use client';

// ============================================
// Universal Lesson Frame — Home Plus LMS
// ============================================
// Renders the 6-section lesson structure:
//   Launch → Warm-Up → Learn → Practice → Check → Reflect
// Applies subject-specific mastery via engine props.

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './lesson.module.css';
import LessonBlockRenderer from './LessonBlockRenderer';
import MasteryCheck from './MasteryCheck';
import ScienceReteach from './ScienceReteach';
import {
  SECTION_ORDER,
  SECTION_LABELS,
  SECTION_ICONS,
  DEFAULT_MASTERY_CONFIG,
  type LessonSectionType,
  type SubjectMode,
  type MasteryConfig,
  type MasteryResult,
  type SectionsData,
} from '@/lib/lesson-types';

// ---------- Props ----------

interface LessonBlock {
  id: string;
  section: LessonSectionType;
  blockType: string;
  content: any;
  order: number;
}

interface QuizQuestion {
  id: string;
  questionText: string;
  questionType: string;
  options: any;
  correctAnswer: string | null;
  outcomeCode: string | null;
  explanation: string | null;
}

interface LessonFrameProps {
  // Launch data
  lessonId: string;
  lessonTitle: string;
  unitTitle: string;
  courseName: string;
  courseIcon: string;
  courseId: string;
  unitId: string;
  estimatedMinutes: number | null;
  learningGoal: string | null;
  successCriteria: string | null;
  materials: string | null;
  lessonPosition: string;
  subjectMode: SubjectMode;
  reflectionPrompt: string | null;
  masteryConfig: MasteryConfig | null;

  // Content
  blocks: LessonBlock[];
  questions: QuizQuestion[];

  // Progress
  initialProgress: {
    status: string;
    sectionsData: SectionsData | null;
  } | null;

  // Warm-up
  warmUpConfig: any | null;
}

// ---------- Section Observer Hook ----------
// Uses IntersectionObserver to mark sections as viewed when they
// scroll into the viewport. Works on both mobile and desktop.
function useSectionObserver(
  sectionRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
  onSectionVisible: (section: LessonSectionType) => void,
) {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const section = (entry.target as HTMLElement).dataset.section as LessonSectionType;
            if (section) onSectionVisible(section);
          }
        }
      },
      { threshold: 0.3 }, // 30% of section visible
    );

    for (const el of Object.values(sectionRefs.current)) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sectionRefs, onSectionVisible]);
}

export default function LessonFrame({
  lessonId,
  lessonTitle,
  unitTitle,
  courseName,
  courseIcon,
  courseId,
  unitId,
  estimatedMinutes,
  learningGoal,
  successCriteria,
  materials,
  lessonPosition,
  subjectMode,
  reflectionPrompt,
  masteryConfig,
  blocks,
  questions,
  initialProgress,
  warmUpConfig,
}: LessonFrameProps) {
  const config = masteryConfig || DEFAULT_MASTERY_CONFIG[subjectMode];

  const [sectionsCompleted, setSectionsCompleted] = useState<SectionsData>(
    initialProgress?.sectionsData || {},
  );
  const [overallStatus, setOverallStatus] = useState(initialProgress?.status || 'NOT_STARTED');
  const [masteryResult, setMasteryResult] = useState<MasteryResult | null>(null);
  const [reteachOutcome, setReteachOutcome] = useState<string | null>(null);
  const [reflectionText, setReflectionText] = useState('');
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [completedBlocks, setCompletedBlocks] = useState<Set<string>>(new Set());

  // Refs for section intersection observer
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Group blocks by section
  const blocksBySection = useMemo(() => {
    const grouped: Record<LessonSectionType, LessonBlock[]> = {
      WARM_UP: [],
      LEARN: [],
      PRACTICE: [],
      CHECK: [],
      REFLECT: [],
    };
    for (const b of blocks) {
      if (grouped[b.section]) {
        grouped[b.section].push(b);
      }
    }
    // Sort each group by order
    for (const key of Object.keys(grouped)) {
      grouped[key as LessonSectionType].sort((a, b) => a.order - b.order);
    }
    return grouped;
  }, [blocks]);

  // Identify interactive blocks that must be completed before mastery check
  const INTERACTIVE_TYPES = new Set(['MATCHING', 'FILL_IN_BLANK', 'MULTIPLE_CHOICE', 'CONSTRUCTED_RESPONSE', 'DRAWING', 'PHOTO_UPLOAD', 'TAKE_PHOTO', 'FILE_UPLOAD', 'MICRO_CHECK']);
  const interactiveBlockIds = useMemo(() => {
    return blocks
      .filter((b) => INTERACTIVE_TYPES.has(b.blockType) && (b.section === 'PRACTICE' || b.section === 'LEARN'))
      .map((b) => b.id);
  }, [blocks]);

  const allBlocksComplete = interactiveBlockIds.length === 0 || interactiveBlockIds.every((id) => completedBlocks.has(id));

  // Callback for when a block is interacted with / submitted
  const handleBlockComplete = useCallback((blockId: string) => {
    setCompletedBlocks((prev) => {
      const next = new Set(prev);
      next.add(blockId);
      return next;
    });
  }, []);

  // Mark section as viewed/completed
  const markSection = useCallback(
    async (section: LessonSectionType) => {
      const sectionKey = section === 'WARM_UP' ? 'warmUp' : section.toLowerCase() as keyof SectionsData;
      if (sectionsCompleted[sectionKey]) return;

      const next = { ...sectionsCompleted, [sectionKey]: true };
      setSectionsCompleted(next);

      // Set overall to IN_PROGRESS on first section view
      if (overallStatus === 'NOT_STARTED') {
        setOverallStatus('IN_PROGRESS');
      }

      try {
        await fetch(`/api/lesson/${lessonId}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sectionsData: next, status: overallStatus === 'NOT_STARTED' ? 'IN_PROGRESS' : overallStatus }),
        });
      } catch (e) {
        console.error('Progress update failed:', e);
      }
    },
    [lessonId, sectionsCompleted, overallStatus],
  );

  // IntersectionObserver-based section tracking (works on mobile + desktop)
  useSectionObserver(sectionRefs, markSection);

  // Handle mastery check completion
  const handleMasteryComplete = useCallback(
    async (result: MasteryResult) => {
      setMasteryResult(result);
      if (result.passed) {
        setOverallStatus('MASTERED');
        const nextSections = { ...sectionsCompleted, check: true };
        setSectionsCompleted(nextSections);

        // Directly send MASTERED status to the progress API
        // (markSection would use stale overallStatus from current render)
        try {
          await fetch(`/api/lesson/${lessonId}/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sectionsData: nextSections,
              status: 'MASTERED',
              masteryScore: result.score,
            }),
          });
        } catch (e) {
          console.error('Progress update failed:', e);
        }
      } else if (result.needsReteach && result.reteachOutcome) {
        setReteachOutcome(result.reteachOutcome);
        setOverallStatus('NEEDS_RETEACH');

        // Send NEEDS_RETEACH status directly
        try {
          await fetch(`/api/lesson/${lessonId}/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sectionsData: sectionsCompleted,
              status: 'NEEDS_RETEACH',
              masteryScore: result.score,
            }),
          });
        } catch (e) {
          console.error('Progress update failed:', e);
        }
      }
    },
    [lessonId, sectionsCompleted],
  );

  // Handle reteach completion
  const handleReteachComplete = useCallback(() => {
    setReteachOutcome(null);
    setMasteryResult(null); // allow retry
  }, []);

  // Reflection submit
  const handleReflectionSubmit = async () => {
    if (!reflectionText.trim()) return;
    markSection('REFLECT');
    setReflectionSaved(true);

    const finalStatus =
      masteryResult?.passed || subjectMode === 'ELA' || subjectMode === 'SOCIAL_STUDIES'
        ? 'MASTERED'
        : overallStatus === 'MASTERED'
        ? 'MASTERED'
        : 'COMPLETE';

    try {
      await fetch(`/api/lesson/${lessonId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionsData: { ...sectionsCompleted, reflect: true },
          status: finalStatus,
          reflectionResponse: reflectionText,
        }),
      });
      setOverallStatus(finalStatus);
    } catch (e) {
      console.error(e);
      setReflectionSaved(false);
    }
  };

  // Determine if student can continue — reflection is always required
  const canContinue =
    reflectionSaved && (
      overallStatus === 'MASTERED' ||
      overallStatus === 'COMPLETE' ||
      // ELA/SS can continue after completing sections
      ((subjectMode === 'ELA' || subjectMode === 'SOCIAL_STUDIES') &&
        (masteryResult?.passed || sectionsCompleted.check))
    );

  // Section key helper
  const sKey = (s: LessonSectionType): keyof SectionsData =>
    s === 'WARM_UP' ? 'warmUp' : s.toLowerCase() as keyof SectionsData;

  return (
    <div className={styles.lessonPage}>
      {/* ===== Progress Bar ===== */}
      <div className={styles.progressBar}>
        {SECTION_ORDER.map((s) => {
          const done = sectionsCompleted[sKey(s)];
          return (
            <div
              key={s}
              className={`${styles.progressDot} ${done ? styles.progressDotComplete : ''}`}
              title={SECTION_LABELS[s]}
            />
          );
        })}
      </div>

      {/* ===== 1. LAUNCH ===== */}
      <div className={styles.launchCard}>
        <div className={styles.launchMeta}>
          <span className={styles.launchBadge}>{courseIcon} {courseName}</span>
          <span className={styles.launchBadge}>📖 {unitTitle}</span>
          <span className={styles.launchBadge}>📍 {lessonPosition}</span>
          {estimatedMinutes != null && estimatedMinutes > 0 && (
            <span className={styles.launchBadge}>⏱️ ~{estimatedMinutes} min</span>
          )}
          {materials && (
            <span className={styles.launchBadge}>📦 {materials}</span>
          )}
        </div>
        <h1 className={styles.launchTitle}>{lessonTitle}</h1>
        {learningGoal && (
          <p className={styles.launchGoal}>
            <strong>🎯 Learning Goal:</strong> {learningGoal}
          </p>
        )}
        {successCriteria && (
          <div>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', margin: '0 0 4px' }}>
              ✓ I can show I&apos;ve learned this when I can:
            </p>
            <ul className={styles.launchCriteria}>
              {successCriteria.split('\n').filter(Boolean).map((c, i) => (
                <li key={i}>{c.replace(/^[-•]\s*/, '')}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ===== 2. WARM-UP ===== */}
      {(blocksBySection.WARM_UP.length > 0 || warmUpConfig) && (
        <div ref={(el) => { sectionRefs.current['WARM_UP'] = el; }} data-section="WARM_UP">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: '#fef3c7', color: '#f59e0b' }}>
              {SECTION_ICONS.WARM_UP}
            </div>
            <div>
              <h2 className={styles.sectionTitle}>{SECTION_LABELS.WARM_UP}</h2>
              <p className={styles.sectionSubtitle}>Activate what you already know</p>
            </div>
          </div>
          {blocksBySection.WARM_UP.map((b) => (
            <LessonBlockRenderer key={b.id} blockType={b.blockType as any} content={b.content} />
          ))}
          {warmUpConfig && !blocksBySection.WARM_UP.length && (
            <div className={styles.blockCard}>
              <p style={{ fontSize: '0.88rem', color: '#334155' }}>
                {typeof warmUpConfig === 'object' && warmUpConfig?.prompt
                  ? warmUpConfig.prompt
                  : 'Think about what you already know about this topic.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ===== 3. LEARN ===== */}
      {blocksBySection.LEARN.length > 0 && (
        <div ref={(el) => { sectionRefs.current['LEARN'] = el; }} data-section="LEARN">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: '#dbeafe', color: '#2563eb' }}>
              {SECTION_ICONS.LEARN}
            </div>
            <div>
              <h2 className={styles.sectionTitle}>{SECTION_LABELS.LEARN}</h2>
              <p className={styles.sectionSubtitle}>Explore new ideas and content</p>
            </div>
          </div>
          {blocksBySection.LEARN.map((b) => (
            <LessonBlockRenderer key={b.id} blockType={b.blockType as any} content={b.content} lessonId={lessonId} blockId={b.id} subjectMode={subjectMode} onAnswer={(val) => { if (val) handleBlockComplete(b.id); }} />
          ))}
        </div>
      )}

      {/* ===== 4. GUIDED PRACTICE ===== */}
      {blocksBySection.PRACTICE.length > 0 && (
        <div ref={(el) => { sectionRefs.current['PRACTICE'] = el; }} data-section="PRACTICE">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: '#dcfce7', color: '#059669' }}>
              {SECTION_ICONS.PRACTICE}
            </div>
            <div>
              <h2 className={styles.sectionTitle}>{SECTION_LABELS.PRACTICE}</h2>
              <p className={styles.sectionSubtitle}>Practice what you&apos;ve learned</p>
            </div>
          </div>
          {blocksBySection.PRACTICE.map((b) => (
            <LessonBlockRenderer key={b.id} blockType={b.blockType as any} content={b.content} lessonId={lessonId} blockId={b.id} subjectMode={subjectMode} onAnswer={(val) => { if (val) handleBlockComplete(b.id); }} />
          ))}
        </div>
      )}

      {/* ===== 5. MASTERY CHECK ===== */}
      <div ref={(el) => { sectionRefs.current['CHECK'] = el; }} data-section="CHECK">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon} style={{ background: '#fef3c7', color: '#d97706' }}>
            {SECTION_ICONS.CHECK}
          </div>
          <div>
            <h2 className={styles.sectionTitle}>{SECTION_LABELS.CHECK}</h2>
            <p className={styles.sectionSubtitle}>
              {subjectMode === 'SCIENCE'
                ? `Score ${config.passPercent}% or higher to unlock the next lesson`
                : subjectMode === 'MATH'
                ? `Score ${config.passPercent}% or higher to continue`
                : 'Show what you know'}
            </p>
          </div>
        </div>

        {/* CHECK section content blocks BEFORE mastery quiz */}
        {blocksBySection.CHECK.map((b) => (
          <LessonBlockRenderer key={b.id} blockType={b.blockType as any} content={b.content} />
        ))}

        {/* Reteach flow (science only) */}
        {reteachOutcome && subjectMode === 'SCIENCE' && (
          <ScienceReteach
            outcomeCode={reteachOutcome}
            contentBlocks={blocksBySection.LEARN.filter(
              (b) => b.blockType === 'TEXT' || b.blockType === 'VIDEO' || b.blockType === 'AI_SUMMARY'
            ).map((b) => ({ blockType: b.blockType, content: b.content }))}
            questions={questions
              .filter((q) => q.outcomeCode === reteachOutcome)
              .map((q) => ({
                id: q.id,
                questionText: q.questionText,
                options: (q.options as any[]) || [],
                explanation: q.explanation || undefined,
              }))}
            lessonId={lessonId}
            onComplete={handleReteachComplete}
          />
        )}

        {/* Regular mastery check */}
        {!reteachOutcome && (
          <MasteryCheck
            questions={questions}
            subjectMode={subjectMode}
            lessonId={lessonId}
            onComplete={handleMasteryComplete}
            config={config}
            locked={!allBlocksComplete}
          />
        )}
      </div>

      {/* ===== 6. REFLECTION ===== */}
      <div ref={(el) => { sectionRefs.current['REFLECT'] = el; }} data-section="REFLECT">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon} style={{ background: '#f3e8ff', color: '#7c3aed' }}>
            {SECTION_ICONS.REFLECT}
          </div>
          <div>
            <h2 className={styles.sectionTitle}>{SECTION_LABELS.REFLECT}</h2>
            <p className={styles.sectionSubtitle}>Look back and look ahead</p>
          </div>
        </div>

        {blocksBySection.REFLECT.map((b) => (
          <LessonBlockRenderer key={b.id} blockType={b.blockType as any} content={b.content} />
        ))}

        <div className={styles.reflectionCard}>
          <p className={styles.reflectionPrompt}>
            {reflectionPrompt || '💭 What is one important thing you learned today?'}
          </p>
          <textarea
            className={styles.textArea}
            value={reflectionText}
            onChange={(e) => setReflectionText(e.target.value)}
            placeholder="Write your reflection..."
            disabled={reflectionSaved}
            style={{ minHeight: 90 }}
          />
          <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className={styles.btnPrimary}
              style={{ background: '#7c3aed' }}
              onClick={handleReflectionSubmit}
              disabled={!reflectionText.trim() || reflectionSaved}
            >
              {reflectionSaved ? '✓ Saved' : '💭 Save Reflection'}
            </button>
            {reflectionSaved && (
              <span style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 600 }}>
                Reflection saved!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ===== Navigation ===== */}
      <div className={styles.lessonNav}>
        <Link
          href={`/student/courses/${courseId}/units/${unitId}`}
          className={styles.btnSecondary}
        >
          ← Back to Unit
        </Link>

        {canContinue && (
          <Link
            href={`/student/courses/${courseId}/units/${unitId}`}
            className={styles.btnPrimary}
            style={{ textDecoration: 'none', background: '#059669' }}
          >
            Continue →
          </Link>
        )}
      </div>
    </div>
  );
}

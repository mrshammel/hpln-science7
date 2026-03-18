'use client';

// ============================================
// Mastery Check — Home Plus LMS
// ============================================
// One-at-a-time mastery quiz with:
// - Random question selection from an outcome-tagged bank
// - Per-question immediate grading + feedback
// - Two-strike reteach: 2 wrong on same outcome → mini-lesson
// - Fresh questions on retry (re-randomized from bank)
// - Locked until lesson is complete (controlled by parent)

import { useState, useCallback, useMemo } from 'react';
import styles from './lesson.module.css';
import type { MasteryConfig, SubjectMode, MasteryResult } from '@/lib/lesson-types';

interface QuizQuestionData {
  id: string;
  questionText: string;
  questionType: string;
  options: any;
  correctAnswer: string | null;
  outcomeCode: string | null;
  explanation: string | null;
}

interface MasteryCheckProps {
  questions: QuizQuestionData[];
  subjectMode: SubjectMode;
  lessonId: string;
  onComplete: (result: MasteryResult) => void;
  config: MasteryConfig;
  locked?: boolean; // true if lesson activities aren't all complete
}

const QUESTIONS_PER_ATTEMPT = 5;

/** Fisher-Yates shuffle a copy of an array */
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MasteryCheck({
  questions,
  subjectMode,
  lessonId,
  onComplete,
  config,
  locked = false,
}: MasteryCheckProps) {
  // Quiz state
  const [phase, setPhase] = useState<'ready' | 'active' | 'feedback' | 'result'>('ready');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState('');
  const [lastFeedback, setLastFeedback] = useState<{
    correct: boolean;
    explanation: string | null;
    outcomeCode: string | null;
  } | null>(null);

  // Scoring accumulators
  const [correctCount, setCorrectCount] = useState(0);
  const [outcomeMisses, setOutcomeMisses] = useState<Record<string, number>>({});
  const [reteachTriggered, setReteachTriggered] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<MasteryResult | null>(null);

  // Select random questions for this attempt
  const startQuiz = useCallback(() => {
    const count = Math.min(QUESTIONS_PER_ATTEMPT, questions.length);
    const selected = shuffleArray(questions).slice(0, count);
    setQuizQuestions(selected);
    setCurrentIndex(0);
    setCorrectCount(0);
    setOutcomeMisses({});
    setReteachTriggered(null);
    setFinalResult(null);
    setSelected('');
    setLastFeedback(null);
    setPhase('active');
  }, [questions]);

  // Handle answer submission for current question
  const handleSubmitAnswer = useCallback(async () => {
    if (!selected) return;
    const q = quizQuestions[currentIndex];
    if (!q) return;

    // Determine correctness
    let correct = false;
    if (q.questionType === 'MULTIPLE_CHOICE' && q.options) {
      const opts = q.options as Array<{ value: string; correct?: boolean }>;
      correct = !!opts.find((o) => o.value === selected)?.correct;
    } else {
      correct =
        q.correctAnswer !== null &&
        selected.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
    }

    const newCorrect = correct ? correctCount + 1 : correctCount;
    setCorrectCount(newCorrect);

    // Track outcome misses for two-strike reteach
    let triggerReteach: string | null = null;
    const newMisses = { ...outcomeMisses };
    if (!correct && q.outcomeCode) {
      newMisses[q.outcomeCode] = (newMisses[q.outcomeCode] || 0) + 1;
      if (newMisses[q.outcomeCode] >= 2) {
        triggerReteach = q.outcomeCode;
      }
    }
    setOutcomeMisses(newMisses);

    // Submit per-question answer to API
    try {
      await fetch(`/api/lesson/${lessonId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          singleQuestion: true,
          questionId: q.id,
          response: selected,
          correct,
          outcomeCode: q.outcomeCode,
        }),
      });
    } catch (e) {
      console.error('Submit failed:', e);
    }

    setLastFeedback({ correct, explanation: q.explanation, outcomeCode: q.outcomeCode });

    if (triggerReteach) {
      setReteachTriggered(triggerReteach);
    }

    setPhase('feedback');
  }, [selected, quizQuestions, currentIndex, correctCount, outcomeMisses, lessonId]);

  // Advance to next question or show results
  const handleNext = useCallback(() => {
    // If reteach was triggered, signal parent
    if (reteachTriggered) {
      const answered = currentIndex + 1;
      const score = answered > 0 ? Math.round((correctCount / answered) * 100) : 0;
      const result: MasteryResult = {
        passed: false,
        score,
        totalQuestions: answered,
        correctCount,
        missedOutcomes: Object.keys(outcomeMisses).filter((k) => outcomeMisses[k] >= 2),
        needsReteach: true,
        reteachOutcome: reteachTriggered,
        feedback: `You need more practice on a specific concept. Let's review it together.`,
        canRetry: false,
      };
      setFinalResult(result);
      setPhase('result');
      onComplete(result);
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= quizQuestions.length) {
      // Quiz complete — calculate final result
      const total = quizQuestions.length;
      const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
      const passed = score >= config.passPercent;
      const missedOutcomes = Object.keys(outcomeMisses).filter((k) => outcomeMisses[k] > 0);

      const result: MasteryResult = {
        passed,
        score,
        totalQuestions: total,
        correctCount,
        missedOutcomes,
        needsReteach: false,
        feedback: passed
          ? `🎉 Mastered! You scored ${score}%. Great work!`
          : `You scored ${score}%. You need ${config.passPercent}% to pass. Try again — you'll get different questions.`,
        canRetry: !passed,
      };
      setFinalResult(result);
      setPhase('result');
      onComplete(result);
    } else {
      setCurrentIndex(nextIndex);
      setSelected('');
      setLastFeedback(null);
      setPhase('active');
    }
  }, [currentIndex, quizQuestions, correctCount, outcomeMisses, config, reteachTriggered, onComplete]);

  // ─── Render: No questions ───
  if (questions.length === 0) {
    if (subjectMode === 'ELA' || subjectMode === 'SOCIAL_STUDIES' || subjectMode === 'GENERAL') {
      return (
        <div className={styles.blockCard} style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
            ✓ Complete the practice activities above to progress.
          </p>
        </div>
      );
    }
    return (
      <div className={styles.blockCard} style={{ textAlign: 'center', padding: 24 }}>
        <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
          📝 Mastery check questions coming soon.
        </p>
      </div>
    );
  }

  // ─── Render: Locked ───
  if (locked) {
    return (
      <div className={styles.blockCard} style={{ textAlign: 'center', padding: 32 }}>
        <p style={{ fontSize: '1.5rem', margin: '0 0 12px' }}>🔒</p>
        <p style={{ fontSize: '0.92rem', fontWeight: 700, color: '#475569', margin: '0 0 6px' }}>
          Mastery Check Locked
        </p>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
          Complete all lesson activities above before beginning the Mastery Check.
        </p>
      </div>
    );
  }

  // ─── Render: Ready to start ───
  if (phase === 'ready') {
    return (
      <div className={styles.blockCard} style={{ textAlign: 'center', padding: 32 }}>
        <p style={{ fontSize: '1.3rem', margin: '0 0 12px' }}>
          {subjectMode === 'SCIENCE' ? '🔬' : subjectMode === 'MATH' ? '🔢' : '📝'}
        </p>
        <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>
          {subjectMode === 'SCIENCE'
            ? `Science Mastery Check`
            : subjectMode === 'MATH'
            ? `Math Mastery Check`
            : 'Check Your Understanding'}
        </p>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 20px', lineHeight: 1.6 }}>
          You&apos;ll answer {Math.min(QUESTIONS_PER_ATTEMPT, questions.length)} questions one at a time.
          <br />Score {config.passPercent}% or higher to continue.
          <br />
          <span style={{ fontSize: '0.8rem' }}>Questions are randomly selected — each attempt is different.</span>
        </p>
        <button
          className={styles.btnPrimary}
          style={{ background: '#d97706', padding: '12px 32px', fontSize: '0.92rem' }}
          onClick={startQuiz}
        >
          ✓ Begin Mastery Check
        </button>
      </div>
    );
  }

  // ─── Render: Result ───
  if (phase === 'result' && finalResult) {
    return (
      <div
        className={`${styles.masteryResultCard} ${
          finalResult.passed
            ? styles.masteryPassed
            : finalResult.needsReteach
            ? styles.masteryReteach
            : styles.masteryFailed
        }`}
      >
        <p
          className={styles.masteryScore}
          style={{ color: finalResult.passed ? '#059669' : finalResult.needsReteach ? '#d97706' : '#dc2626' }}
        >
          {finalResult.score}%
        </p>
        <p className={styles.masteryFeedback}>{finalResult.feedback}</p>
        {finalResult.canRetry && (
          <button
            className={styles.btnPrimary}
            style={{ background: '#d97706' }}
            onClick={startQuiz}
          >
            🔄 Try Again (New Questions)
          </button>
        )}
      </div>
    );
  }

  // ─── Render: Active question / Feedback ───
  const q = quizQuestions[currentIndex];
  const progress = quizQuestions.length > 0 ? ((currentIndex + (phase === 'feedback' ? 1 : 0)) / quizQuestions.length) * 100 : 0;

  return (
    <div className={styles.masteryCard}>
      {/* Progress header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#92400e', margin: 0 }}>
          Question {currentIndex + 1} of {quizQuestions.length}
        </p>
        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
          {correctCount}/{phase === 'feedback' ? currentIndex + 1 : currentIndex} correct
        </p>
      </div>
      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#d97706', borderRadius: 3, width: `${progress}%`, transition: 'width 0.4s ease' }} />
      </div>

      {/* Question */}
      <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.92rem', margin: '0 0 14px', lineHeight: 1.5 }}>
        {q?.questionText}
      </p>

      {/* Options */}
      {q?.questionType === 'MULTIPLE_CHOICE' && q.options && (
        (q.options as Array<{ label: string; value: string; correct?: boolean }>).map((opt, j) => {
          let cls = styles.mcOption;
          const isSelected = selected === opt.value;
          if (isSelected) cls += ' ' + styles.mcOptionSelected;

          // Show correct/incorrect after feedback
          if (phase === 'feedback' && isSelected) {
            cls += ' ' + (lastFeedback?.correct ? styles.mcOptionCorrect : styles.mcOptionIncorrect);
          }
          if (phase === 'feedback' && opt.correct) {
            cls += ' ' + styles.mcOptionCorrect;
          }

          return (
            <div
              key={j}
              className={cls}
              onClick={() => phase === 'active' && setSelected(opt.value)}
              style={{ cursor: phase === 'active' ? 'pointer' : 'default' }}
            >
              <div
                className={styles.mcRadio}
                style={isSelected ? { background: '#d97706', borderColor: '#d97706' } : {}}
              />
              <span>{opt.label}</span>
            </div>
          );
        })
      )}

      {/* Short answer / Fill-in */}
      {(q?.questionType === 'SHORT_ANSWER' || q?.questionType === 'FILL_IN_BLANK') && (
        <input
          type="text"
          value={selected}
          onChange={(e) => phase === 'active' && setSelected(e.target.value)}
          className={styles.fillBlank}
          style={{ width: '100%', maxWidth: 400 }}
          placeholder="Your answer..."
          disabled={phase === 'feedback'}
        />
      )}

      {/* True/False */}
      {q?.questionType === 'TRUE_FALSE' && (
        <div style={{ display: 'flex', gap: 8 }}>
          {['True', 'False'].map((tf) => (
            <div
              key={tf}
              className={`${styles.mcOption} ${selected === tf ? styles.mcOptionSelected : ''}`}
              onClick={() => phase === 'active' && setSelected(tf)}
              style={{ flex: 1, justifyContent: 'center', cursor: phase === 'active' ? 'pointer' : 'default' }}
            >
              {tf}
            </div>
          ))}
        </div>
      )}

      {/* Submit button (active phase) */}
      {phase === 'active' && (
        <button
          className={styles.btnPrimary}
          onClick={handleSubmitAnswer}
          disabled={!selected}
          style={{ marginTop: 16, background: '#d97706' }}
        >
          Submit Answer
        </button>
      )}

      {/* Feedback (feedback phase) */}
      {phase === 'feedback' && lastFeedback && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: lastFeedback.correct ? '#f0fdf4' : '#fef2f2',
            border: `1.5px solid ${lastFeedback.correct ? '#86efac' : '#fca5a5'}`,
            marginBottom: 12,
          }}>
            <p style={{
              fontWeight: 700,
              fontSize: '0.9rem',
              color: lastFeedback.correct ? '#059669' : '#dc2626',
              margin: '0 0 4px',
            }}>
              {lastFeedback.correct ? '✓ Correct!' : '✗ Not quite.'}
            </p>
            {lastFeedback.explanation && (
              <p style={{ fontSize: '0.84rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                💡 {lastFeedback.explanation}
              </p>
            )}
          </div>
          <button
            className={styles.btnPrimary}
            style={{ background: reteachTriggered ? '#d97706' : '#2563eb' }}
            onClick={handleNext}
          >
            {reteachTriggered
              ? '🔄 Go to Targeted Review'
              : currentIndex + 1 >= quizQuestions.length
              ? '📊 See Results'
              : 'Next Question →'}
          </button>
        </div>
      )}
    </div>
  );
}

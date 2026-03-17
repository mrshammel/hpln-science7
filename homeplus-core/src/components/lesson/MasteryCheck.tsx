'use client';

// ============================================
// Mastery Check — Home Plus LMS
// ============================================
// Renders the mastery check section.
// Applies subject-specific scoring via the mastery engine.

import { useState } from 'react';
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
}

export default function MasteryCheck({
  questions,
  subjectMode,
  lessonId,
  onComplete,
  config,
}: MasteryCheckProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<MasteryResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);

  const handleSelect = (questionId: string, value: string) => {
    if (result) return; // locked after submission
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/lesson/${lessonId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionId, response]) => ({
            questionId,
            response,
          })),
        }),
      });

      if (res.ok) {
        const data: MasteryResult = await res.json();
        setResult(data);
        setShowExplanations(true);
        onComplete(data);
      }
    } catch (e) {
      console.error('Submit failed:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const allAnswered = questions.every((q) => answers[q.id]);

  if (questions.length === 0) {
    // No quiz questions — auto-pass for ELA/Social Studies modes
    if (subjectMode === 'ELA' || subjectMode === 'SOCIAL_STUDIES' || subjectMode === 'GENERAL') {
      return (
        <div className={styles.blockCard} style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
            ✓ Complete the practice activities above to progress.
          </p>
        </div>
      );
    }
    // Science/Math with no questions = teacher hasn't added them yet
    return (
      <div className={styles.blockCard} style={{ textAlign: 'center', padding: 24 }}>
        <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
          📝 Mastery check questions coming soon.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Result banner */}
      {result && (
        <div
          className={`${styles.masteryResultCard} ${
            result.passed
              ? styles.masteryPassed
              : result.needsReteach
              ? styles.masteryReteach
              : styles.masteryFailed
          }`}
        >
          <p className={styles.masteryScore} style={{ color: result.passed ? '#059669' : result.needsReteach ? '#d97706' : '#dc2626' }}>
            {result.score}%
          </p>
          <p className={styles.masteryFeedback}>{result.feedback}</p>
          {result.canRetry && (
            <button
              className={styles.btnPrimary}
              onClick={() => {
                setResult(null);
                setAnswers({});
                setShowExplanations(false);
              }}
            >
              🔄 Try Again
            </button>
          )}
        </div>
      )}

      {/* Questions */}
      {!result && (
        <div className={styles.masteryCard}>
          <p style={{ fontWeight: 700, fontSize: '0.92rem', color: '#92400e', margin: '0 0 16px' }}>
            {subjectMode === 'SCIENCE'
              ? `🔬 Science Mastery Check — Score ${config.passPercent}% or higher to continue`
              : subjectMode === 'MATH'
              ? `🔢 Math Mastery Check — Score ${config.passPercent}% or higher`
              : '📝 Check Your Understanding'}
          </p>

          {questions.map((q, i) => (
            <div key={q.id} style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem', margin: '0 0 8px' }}>
                {i + 1}. {q.questionText}
              </p>

              {q.questionType === 'MULTIPLE_CHOICE' && q.options && (
                (q.options as Array<{ label: string; value: string; correct?: boolean }>).map((opt, j) => {
                  let cls = styles.mcOption;
                  if (answers[q.id] === opt.value) cls += ' ' + styles.mcOptionSelected;

                  return (
                    <div key={j} className={cls} onClick={() => handleSelect(q.id, opt.value)}>
                      <div
                        className={styles.mcRadio}
                        style={answers[q.id] === opt.value ? { background: '#d97706', borderColor: '#d97706' } : {}}
                      />
                      <span>{opt.label}</span>
                    </div>
                  );
                })
              )}

              {(q.questionType === 'SHORT_ANSWER' || q.questionType === 'FILL_IN_BLANK') && (
                <input
                  type="text"
                  value={answers[q.id] || ''}
                  onChange={(e) => handleSelect(q.id, e.target.value)}
                  className={styles.fillBlank}
                  style={{ width: '100%', maxWidth: 400, display: 'block' }}
                  placeholder="Your answer..."
                />
              )}

              {q.questionType === 'TRUE_FALSE' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {['True', 'False'].map((tf) => (
                    <div
                      key={tf}
                      className={`${styles.mcOption} ${answers[q.id] === tf ? styles.mcOptionSelected : ''}`}
                      onClick={() => handleSelect(q.id, tf)}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      {tf}
                    </div>
                  ))}
                </div>
              )}

              {/* Show explanation after grading */}
              {showExplanations && q.explanation && (
                <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: 6, padding: '6px 10px', background: '#f8fafc', borderRadius: 6 }}>
                  💡 {q.explanation}
                </p>
              )}
            </div>
          ))}

          <button
            className={styles.btnPrimary}
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            style={{ marginTop: 10, background: '#d97706' }}
          >
            {submitting ? 'Checking...' : '✓ Submit Answers'}
          </button>
        </div>
      )}
    </div>
  );
}

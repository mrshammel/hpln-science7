'use client';

// ============================================
// Science Reteach Flow — Home Plus LMS
// ============================================
// Mini-reteach experience for science mastery.
// Shows relevant content segment, summary, and
// requires 3 correct in a row to exit.

import { useState } from 'react';
import styles from './lesson.module.css';

interface ReteachBlock {
  blockType: string;
  content: any;
}

interface ReteachQuestion {
  id: string;
  questionText: string;
  options: Array<{ label: string; value: string; correct?: boolean }>;
  explanation?: string;
}

interface ScienceReteachProps {
  outcomeCode: string;
  outcomeDescription?: string;
  contentBlocks: ReteachBlock[]; // relevant LEARN blocks to re-present
  questions: ReteachQuestion[];  // questions for this outcome
  lessonId: string;
  onComplete: () => void;
}

export default function ScienceReteach({
  outcomeCode,
  outcomeDescription,
  contentBlocks,
  questions,
  lessonId,
  onComplete,
}: ScienceReteachProps) {
  const [phase, setPhase] = useState<'review' | 'practice'>('review');
  const [currentQ, setCurrentQ] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selected, setSelected] = useState('');
  const [feedback, setFeedback] = useState<{ correct: boolean; explanation?: string } | null>(null);
  const REQUIRED_STREAK = 3;

  const handleAnswer = async () => {
    if (!selected) return;

    const q = questions[currentQ % questions.length];
    const correct = q.options.find((o) => o.correct)?.value === selected;

    // Record attempt
    try {
      await fetch(`/api/lesson/${lessonId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reteach: true,
          outcomeCode,
          questionId: q.id,
          response: selected,
          correct,
        }),
      });
    } catch (e) {
      console.error('Reteach submit failed:', e);
    }

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setFeedback({ correct: true, explanation: q.explanation });

      if (newStreak >= REQUIRED_STREAK) {
        // Reteach complete!
        setTimeout(() => onComplete(), 1500);
      }
    } else {
      setStreak(0);
      setFeedback({ correct: false, explanation: q.explanation });
    }
  };

  const handleNext = () => {
    setSelected('');
    setFeedback(null);
    setCurrentQ((prev) => prev + 1);
  };

  return (
    <div style={{ background: '#fff7ed', border: '2px solid #fdba74', borderRadius: 16, padding: 24, marginBottom: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: '1.5rem' }}>🔄</span>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#92400e', margin: 0 }}>
            Targeted Review
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#b45309', margin: 0 }}>
            Let&apos;s review this concept together — you&apos;ve got this!
          </p>
        </div>
      </div>

      {outcomeDescription && (
        <div style={{ background: '#fef3c7', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#92400e', margin: 0 }}>
            🎯 Focus: {outcomeDescription}
          </p>
        </div>
      )}

      {/* Progress */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {Array.from({ length: REQUIRED_STREAK }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              background: i < streak ? '#22c55e' : '#e2e8f0',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 16px', textAlign: 'center' }}>
        {streak >= REQUIRED_STREAK
          ? '🎉 Great job! You mastered this concept!'
          : `Get ${REQUIRED_STREAK - streak} more correct in a row`}
      </p>

      {/* Phase: Review */}
      {phase === 'review' && (
        <div>
          {contentBlocks.length > 0 ? (
            <div style={{ marginBottom: 16 }}>
              {contentBlocks.map((block, i) => (
                <div key={i} className={styles.blockCard}>
                  {block.blockType === 'TEXT' && (
                    <div dangerouslySetInnerHTML={{ __html: (block.content as any).html || '' }} style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.7 }} />
                  )}
                  {block.blockType === 'VIDEO' && (
                    <div>
                      <p style={{ fontWeight: 600, marginBottom: 8 }}>🎥 Rewatch this segment:</p>
                      <div className={styles.videoBlock}>
                        <iframe
                          src={(block.content as any).url}
                          title="Review video"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}
                  {block.blockType === 'AI_SUMMARY' && (
                    <div>
                      <p style={{ fontWeight: 600, color: '#6b21a8', fontSize: '0.82rem', marginBottom: 4 }}>🤖 Key Points:</p>
                      <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>{(block.content as any).summary}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.blockCard}>
              <p style={{ fontSize: '0.88rem', color: '#475569' }}>
                Review the lesson material above, then click below when you&apos;re ready to try again.
              </p>
            </div>
          )}

          <button
            className={styles.btnPrimary}
            style={{ background: '#d97706' }}
            onClick={() => setPhase('practice')}
          >
            I&apos;m ready to try again →
          </button>
        </div>
      )}

      {/* Phase: Practice */}
      {phase === 'practice' && streak < REQUIRED_STREAK && (
        <div>
          {questions.length > 0 ? (
            <div>
              <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem', margin: '0 0 10px' }}>
                {questions[currentQ % questions.length].questionText}
              </p>

              {questions[currentQ % questions.length].options.map((opt, i) => {
                let cls = styles.mcOption;
                if (selected === opt.value) cls += ' ' + styles.mcOptionSelected;
                if (feedback && selected === opt.value) {
                  cls += ' ' + (feedback.correct ? styles.mcOptionCorrect : styles.mcOptionIncorrect);
                }

                return (
                  <div
                    key={i}
                    className={cls}
                    onClick={() => !feedback && setSelected(opt.value)}
                  >
                    <div
                      className={styles.mcRadio}
                      style={selected === opt.value ? { background: '#d97706', borderColor: '#d97706' } : {}}
                    />
                    <span>{opt.label}</span>
                  </div>
                );
              })}

              {!feedback && selected && (
                <button
                  className={styles.btnPrimary}
                  style={{ marginTop: 10, background: '#d97706' }}
                  onClick={handleAnswer}
                >
                  Check Answer
                </button>
              )}

              {feedback && (
                <div style={{ marginTop: 12 }}>
                  <p style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: feedback.correct ? '#059669' : '#dc2626',
                    margin: '0 0 6px',
                  }}>
                    {feedback.correct ? '✓ Correct!' : '✗ Not quite.'}
                  </p>
                  {feedback.explanation && (
                    <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0 0 10px' }}>
                      💡 {feedback.explanation}
                    </p>
                  )}
                  {streak < REQUIRED_STREAK && (
                    <button className={styles.btnSecondary} onClick={handleNext}>
                      Next Question →
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: '#64748b' }}>No review questions available.</p>
          )}
        </div>
      )}

      {/* Completed */}
      {streak >= REQUIRED_STREAK && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <p style={{ fontSize: '1.5rem', margin: '0 0 8px' }}>🎉</p>
          <p style={{ fontSize: '0.92rem', fontWeight: 700, color: '#059669' }}>
            You&apos;ve mastered this concept!
          </p>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Returning to the mastery check...
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================
// SubmissionFeedback — Student-Facing Component
// ============================================
// Shows AI initial feedback + teacher review status
// after a student submits written work.
// Polls for AI completion if status is PENDING.

// ---------- Types ----------

interface AiFeedbackData {
  aiFeedback: string;
  aiStrengths: string;
  aiAreasForImprovement: string;
  aiNextSteps: string;
  aiProvisionalScore: number | null;
  aiPerformanceLevel: string;
  aiGeneratedAt: string;
  maxScore: number | null;
  teacherReviewed: boolean;
  teacherFeedback: string | null;
  teacherScore: number | null;
  finalizedByTeacher: boolean;
}

interface SubmissionFeedbackProps {
  submissionId: string;
  initialAiStatus: 'NONE' | 'PENDING' | 'COMPLETE' | 'FAILED';
  activityTitle: string;
}

// ---------- Performance Level Badge ----------

const LEVEL_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  EMERGING:    { label: 'Emerging',    emoji: '🌱', color: '#b45309', bg: '#fef3c7' },
  APPROACHING: { label: 'Approaching', emoji: '📈', color: '#0369a1', bg: '#e0f2fe' },
  MEETING:     { label: 'Meeting',     emoji: '✅', color: '#15803d', bg: '#dcfce7' },
  EXCEEDING:   { label: 'Exceeding',   emoji: '🌟', color: '#7c3aed', bg: '#ede9fe' },
};

function PerformanceBadge({ level }: { level: string }) {
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.APPROACHING;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 14px', borderRadius: 20, fontSize: '0.92rem', fontWeight: 600,
      color: config.color, background: config.bg,
    }}>
      {config.emoji} {config.label}
    </span>
  );
}

// ---------- Main Component ----------

export default function SubmissionFeedback({
  submissionId,
  initialAiStatus,
  activityTitle,
}: SubmissionFeedbackProps) {
  const [aiStatus, setAiStatus] = useState(initialAiStatus);
  const [feedback, setFeedback] = useState<AiFeedbackData | null>(null);
  const [pollCount, setPollCount] = useState(0);

  // Poll for AI feedback completion
  const pollForFeedback = useCallback(async () => {
    try {
      const res = await fetch(`/api/submissions/${submissionId}/ai-status`);
      if (!res.ok) return;

      const data = await res.json();
      setAiStatus(data.aiStatus);

      if (data.aiStatus === 'COMPLETE') {
        setFeedback(data);
      }
    } catch {
      // Silently retry on network errors
    }
    setPollCount((c) => c + 1);
  }, [submissionId]);

  useEffect(() => {
    if (aiStatus !== 'PENDING') return;
    // Poll every 2 seconds, max 30 attempts (60 seconds)
    if (pollCount >= 30) {
      setAiStatus('FAILED');
      return;
    }
    const timer = setTimeout(pollForFeedback, 2000);
    return () => clearTimeout(timer);
  }, [aiStatus, pollCount, pollForFeedback]);

  // Load feedback on mount if already complete
  useEffect(() => {
    if (initialAiStatus === 'COMPLETE') {
      pollForFeedback();
    }
  }, [initialAiStatus, pollForFeedback]);

  return (
    <div style={{
      maxWidth: 680, margin: '0 auto', padding: '24px 16px',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* ===== SUBMISSION CONFIRMED ===== */}
      <div style={{
        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12,
        padding: '20px 24px', marginBottom: 20, textAlign: 'center',
      }}>
        <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>✅</div>
        <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#15803d' }}>Submission Received</h2>
        <p style={{ margin: '6px 0 0', fontSize: '0.88rem', color: '#166534' }}>
          Your response for <strong>{activityTitle}</strong> has been saved.
        </p>
      </div>

      {/* ===== AI PENDING STATE ===== */}
      {aiStatus === 'PENDING' && (
        <div style={{
          background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 12,
          padding: '24px', marginBottom: 20, textAlign: 'center',
        }}>
          <div style={{
            width: 40, height: 40, margin: '0 auto 12px',
            border: '3px solid #e9d5ff', borderTopColor: '#8b5cf6',
            borderRadius: '50%', animation: 'spin 1s linear infinite',
          }} />
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#6d28d9' }}>
            🤖 Generating Initial Feedback...
          </h3>
          <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#7c3aed' }}>
            Our AI is reviewing your writing. This usually takes a few seconds.
          </p>
        </div>
      )}

      {/* ===== AI FEEDBACK COMPLETE ===== */}
      {aiStatus === 'COMPLETE' && feedback && (
        <>
          {/* Performance Level (primary result) */}
          <div style={{
            background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 12,
            padding: '20px 24px', marginBottom: 16, textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 8 }}>
              🤖 AI Initial Assessment
            </div>
            <PerformanceBadge level={feedback.aiPerformanceLevel} />
            {feedback.aiProvisionalScore !== null && feedback.maxScore && (
              <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#6b7280' }}>
                Provisional score: {feedback.aiProvisionalScore} / {feedback.maxScore}
              </div>
            )}
          </div>

          {/* AI Feedback Details */}
          <div style={{
            background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12,
            padding: '20px 24px', marginBottom: 16,
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#1e293b' }}>
              🤖 AI Initial Feedback
            </h3>

            {/* Overall */}
            <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#374151', lineHeight: 1.6 }}>
              {feedback.aiFeedback}
            </p>

            {/* Strengths */}
            <div style={{
              background: '#f0fdf4', borderRadius: 8, padding: '14px 16px', marginBottom: 12,
              borderLeft: '3px solid #22c55e',
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#15803d', marginBottom: 6 }}>
                ✨ What you did well
              </div>
              <div style={{ fontSize: '0.88rem', color: '#166534', lineHeight: 1.6 }}>
                {feedback.aiStrengths}
              </div>
            </div>

            {/* Areas for Improvement */}
            <div style={{
              background: '#fffbeb', borderRadius: 8, padding: '14px 16px', marginBottom: 12,
              borderLeft: '3px solid #f59e0b',
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#b45309', marginBottom: 6 }}>
                📝 What to improve next
              </div>
              <div style={{ fontSize: '0.88rem', color: '#92400e', lineHeight: 1.6 }}>
                {feedback.aiAreasForImprovement}
              </div>
            </div>

            {/* Next Steps */}
            <div style={{
              background: '#eff6ff', borderRadius: 8, padding: '14px 16px',
              borderLeft: '3px solid #3b82f6',
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1d4ed8', marginBottom: 6 }}>
                🎯 Suggested next step
              </div>
              <div style={{ fontSize: '0.88rem', color: '#1e40af', lineHeight: 1.6 }}>
                {feedback.aiNextSteps}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== AI FAILED ===== */}
      {aiStatus === 'FAILED' && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12,
          padding: '16px 20px', marginBottom: 16,
        }}>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#991b1b' }}>
            AI feedback could not be generated right now. Don&apos;t worry — your teacher will still review your work and provide feedback.
          </p>
        </div>
      )}

      {/* ===== TEACHER REVIEW STATUS ===== */}
      {feedback?.teacherReviewed && feedback?.finalizedByTeacher ? (
        <div style={{
          background: '#ffffff', border: '2px solid #16a34a', borderRadius: 12,
          padding: '20px 24px', marginBottom: 16,
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#15803d' }}>
            👩‍🏫 Teacher Feedback
          </h3>
          {feedback.teacherScore !== null && feedback.maxScore && (
            <div style={{
              fontSize: '1.3rem', fontWeight: 700, color: '#1e293b', marginBottom: 12,
            }}>
              Final Grade: {feedback.teacherScore} / {feedback.maxScore}
            </div>
          )}
          {feedback.teacherFeedback && (
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#374151', lineHeight: 1.6 }}>
              {feedback.teacherFeedback}
            </p>
          )}
        </div>
      ) : (
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12,
          padding: '16px 20px', marginBottom: 16, textAlign: 'center',
        }}>
          <span style={{ fontSize: '0.88rem', color: '#64748b' }}>
            ⏳ <strong>Teacher Review Pending</strong> — Your teacher will review your work and assign the final grade.
          </span>
        </div>
      )}

      {/* ===== DISCLAIMER ===== */}
      {(aiStatus === 'COMPLETE' || aiStatus === 'PENDING') && (
        <div style={{
          background: '#f8fafc', borderRadius: 8, padding: '12px 16px',
          fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5,
          borderLeft: '3px solid #94a3b8',
        }}>
          📌 This is an AI-generated initial review to help guide your revision and reflection.
          Your teacher will review your submission and assign the final grade.
        </div>
      )}

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

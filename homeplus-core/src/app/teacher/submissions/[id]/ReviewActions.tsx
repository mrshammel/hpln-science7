'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../teacher.module.css';

// ---------- Types ----------

interface OutcomeOption {
  id: string;
  code: string;
  description: string;
  unitContext: string | null;
}

interface MasteryUpdate {
  outcomeId: string;
  level: string;
  note: string;
}

interface ReviewActionsProps {
  submissionId: string;
  studentId: string;
  studentName: string;
  isReviewed: boolean;
  existingFeedback: string | null;
  existingScore: number | null;
  maxScore: number | null;
  outcomes: OutcomeOption[];
  contextQuery: string;
  // AI feedback props
  aiFeedback: string | null;
  aiProvisionalScore: number | null;
  aiPerformanceLevel: string | null;
  aiStatus: string;
}

const MASTERY_LEVELS = [
  { value: 'NOT_YET_ASSESSED', label: 'Not Yet Assessed', icon: '⬜' },
  { value: 'EMERGING', label: 'Emerging', icon: '🔴' },
  { value: 'APPROACHING', label: 'Approaching', icon: '🟡' },
  { value: 'MEETING', label: 'Meeting', icon: '🟢' },
  { value: 'EXCEEDING', label: 'Exceeding', icon: '🔵' },
];

const NOTE_TAGS = [
  'General', 'Support Concern', 'Parent Communication', 'Intervention',
  'Follow-Up Needed', 'Observation', 'Mastery Rationale',
];

// ---------- Component ----------

export default function ReviewActions({
  submissionId,
  studentId,
  studentName,
  isReviewed,
  existingFeedback,
  existingScore,
  maxScore,
  outcomes,
  contextQuery,
  aiFeedback,
  aiProvisionalScore,
  aiPerformanceLevel,
  aiStatus,
}: ReviewActionsProps) {
  const router = useRouter();

  // Feedback state
  const [feedback, setFeedback] = useState(existingFeedback || '');
  const [score, setScore] = useState(existingScore !== null ? String(existingScore) : '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Mastery state
  const [showMastery, setShowMastery] = useState(false);
  const [masteryUpdates, setMasteryUpdates] = useState<MasteryUpdate[]>([]);

  // Note state
  const [showNote, setShowNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteTag, setNoteTag] = useState('General');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  // ---------- Mastery Helpers ----------

  const addMasteryUpdate = useCallback(() => {
    if (outcomes.length === 0) return;
    const used = new Set(masteryUpdates.map((m) => m.outcomeId));
    const available = outcomes.find((o) => !used.has(o.id));
    if (available) {
      setMasteryUpdates((prev) => [...prev, { outcomeId: available.id, level: 'NOT_YET_ASSESSED', note: '' }]);
    }
  }, [outcomes, masteryUpdates]);

  const updateMastery = useCallback((index: number, field: keyof MasteryUpdate, value: string) => {
    setMasteryUpdates((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const removeMastery = useCallback((index: number) => {
    setMasteryUpdates((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ---------- Submit Review ----------

  const handleSubmitReview = async () => {
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const body: Record<string, unknown> = {
        submissionId,
        feedback: feedback.trim() || undefined,
      };
      if (score.trim() && !isNaN(parseFloat(score.trim()))) {
        body.score = parseFloat(score.trim());
      }
      if (masteryUpdates.length > 0) {
        body.masteryUpdates = masteryUpdates.filter((m) => m.level !== 'NOT_YET_ASSESSED');
      }

      const res = await fetch('/api/teacher/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save review');
      }

      setSaved(true);
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  // ---------- Submit Note ----------

  const handleSubmitNote = async () => {
    if (!noteContent.trim()) return;
    setNoteSaving(true);

    try {
      const res = await fetch('/api/teacher/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          content: noteContent.trim(),
          tag: noteTag,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save note');
      }

      setNoteSaved(true);
      setNoteContent('');
      setTimeout(() => setNoteSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setNoteSaving(false);
    }
  };

  // ---------- Render ----------

  return (
    <>
      {/* ===== FEEDBACK SECTION ===== */}
      <div className={styles.dashCard} style={{ marginBottom: 16 }}>
        <h3 className={styles.cardTitle}>💬 Teacher Feedback</h3>

        {/* Use AI as starting point button */}
        {aiStatus === 'COMPLETE' && aiFeedback && !feedback.trim() && (
          <button
            className={styles.smallBtn}
            style={{ marginBottom: 10, fontSize: '0.82rem', padding: '6px 12px', background: '#ede9fe', color: '#6d28d9' }}
            onClick={() => setFeedback(aiFeedback)}
          >
            🤖 Use AI feedback as starting point
          </button>
        )}

        <textarea
          className={styles.feedbackTextarea}
          placeholder="Write your feedback for this student's work..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={5}
        />

        {/* Optional Score */}
        {maxScore !== null && (
          <div className={styles.scoreInputRow}>
            <label className={styles.reviewInfoLabel}>
              {aiStatus === 'COMPLETE' ? 'Final Teacher Score' : 'Score'}
            </label>
            <div className={styles.scoreInputGroup}>
              <input
                type="number"
                className={styles.scoreInput}
                placeholder="—"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                min={0}
                max={maxScore}
                step={0.5}
              />
              <span className={styles.scoreInputMax}>/ {maxScore}</span>
            </div>
          </div>
        )}
      </div>

      {/* ===== MASTERY ASSESSMENT ===== */}
      <div className={styles.dashCard} style={{ marginBottom: 16 }}>
        <h3 className={styles.cardTitle}>
          🎯 Mastery Assessment
          {!showMastery && (
            <button
              className={styles.smallBtn}
              style={{ marginLeft: 'auto' }}
              onClick={() => { setShowMastery(true); if (masteryUpdates.length === 0) addMasteryUpdate(); }}
            >
              + Assess
            </button>
          )}
        </h3>

        {showMastery && (
          <>
            {masteryUpdates.map((mu, i) => {
              const used = new Set(masteryUpdates.filter((_, j) => j !== i).map((m) => m.outcomeId));
              const available = outcomes.filter((o) => !used.has(o.id) || o.id === mu.outcomeId);

              return (
                <div key={i} className={styles.masteryRow}>
                  <select
                    className={styles.masterySelect}
                    value={mu.outcomeId}
                    onChange={(e) => updateMastery(i, 'outcomeId', e.target.value)}
                  >
                    {available.map((o) => (
                      <option key={o.id} value={o.id}>{o.code} — {o.description.slice(0, 60)}</option>
                    ))}
                  </select>
                  <select
                    className={styles.masteryLevelSelect}
                    value={mu.level}
                    onChange={(e) => updateMastery(i, 'level', e.target.value)}
                  >
                    {MASTERY_LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>{l.icon} {l.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className={styles.masteryNote}
                    placeholder="Brief note (optional)"
                    value={mu.note}
                    onChange={(e) => updateMastery(i, 'note', e.target.value)}
                  />
                  <button
                    className={styles.smallBtn}
                    style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 8px' }}
                    onClick={() => removeMastery(i)}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
            {masteryUpdates.length < outcomes.length && (
              <button className={styles.smallBtn} onClick={addMasteryUpdate} style={{ marginTop: 8 }}>
                + Add Outcome
              </button>
            )}
          </>
        )}

        {!showMastery && (
          <div style={{ fontSize: '0.85rem', color: 'var(--hp-text3)', lineHeight: 1.5 }}>
            Link this work to learning outcomes and record mastery levels.
          </div>
        )}
      </div>

      {/* ===== MARK REVIEWED ACTION ===== */}
      <button
        className={styles.primaryBtn}
        disabled={saving}
        onClick={handleSubmitReview}
      >
        {saving ? 'Saving...' : saved ? '✓ Saved!' : isReviewed ? '✓ Update Review' : '✓ Mark as Reviewed'}
      </button>

      {error && (
        <div className={styles.errorMsg}>{error}</div>
      )}
      {saved && (
        <div className={styles.successMsg}>Review saved successfully!</div>
      )}

      {/* ===== ADD NOTE ===== */}
      <div className={styles.dashCard} style={{ marginTop: 16 }}>
        <h3 className={styles.cardTitle}>
          📋 Add Note
          {!showNote && (
            <button
              className={styles.smallBtn}
              style={{ marginLeft: 'auto' }}
              onClick={() => setShowNote(true)}
            >
              + Note
            </button>
          )}
        </h3>

        {showNote ? (
          <>
            <div style={{ fontSize: '0.82rem', color: 'var(--hp-text3)', marginBottom: 8 }}>
              Note for <strong>{studentName}</strong>
            </div>
            <select
              className={styles.noteTagSelect}
              value={noteTag}
              onChange={(e) => setNoteTag(e.target.value)}
            >
              {NOTE_TAGS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <textarea
              className={styles.feedbackTextarea}
              placeholder="Write your note..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={3}
              style={{ marginTop: 8 }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                className={styles.smallBtn}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                onClick={handleSubmitNote}
                disabled={noteSaving || !noteContent.trim()}
              >
                {noteSaving ? 'Saving...' : noteSaved ? '✓ Saved' : 'Save Note'}
              </button>
              <button
                className={styles.smallBtn}
                style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#f1f5f9', color: '#475569' }}
                onClick={() => { setShowNote(false); setNoteContent(''); }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div style={{ fontSize: '0.85rem', color: 'var(--hp-text3)', lineHeight: 1.5 }}>
            Add a teacher note about this student or submission.
          </div>
        )}
      </div>
    </>
  );
}

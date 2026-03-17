'use client';

import { useState } from 'react';
import styles from '../../teacher.module.css';

// ---------- Types ----------

interface UnitOverrideInfo {
  unitId: string;
  unitTitle: string;
  unitIcon: string;
  unitOrder: number;
  currentOverride: string | null; // UNLOCKED | COMPLETED | EXEMPT | null
  currentNote: string | null;
  completionPct: number;
}

interface StudentActionsProps {
  studentId: string;
  studentName: string;
  contextQuery: string;
  unitOverrides?: UnitOverrideInfo[];
}

const NOTE_TAGS = [
  'General', 'Support Concern', 'Parent Communication', 'Intervention',
  'Follow-Up Needed', 'Observation', 'Mastery Rationale',
];

const OVERRIDE_OPTIONS = [
  { value: '', label: '— Default Progression —' },
  { value: 'UNLOCKED', label: '🔓 Unlock (student can enter)' },
  { value: 'COMPLETED', label: '✅ Mark Complete (counts as satisfied)' },
  { value: 'EXEMPT', label: '⏭️ Exempt (skip, counts as satisfied)' },
];

const REASON_PRESETS = [
  'Completed at previous school',
  'Intake placement decision',
  'Exempt due to prior mastery',
  'Teacher placement adjustment',
  'Acceleration pathway',
];

// ---------- Component ----------

export default function StudentActions({ studentId, studentName, contextQuery, unitOverrides = [] }: StudentActionsProps) {
  // Note state
  const [showNote, setShowNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteTag, setNoteTag] = useState('General');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteError, setNoteError] = useState('');

  // Unit override state
  const [showOverride, setShowOverride] = useState(false);
  const [overrideSaving, setOverrideSaving] = useState<string | null>(null); // unitId being saved
  const [overrideSuccess, setOverrideSuccess] = useState<string | null>(null);
  const [overrideError, setOverrideError] = useState('');
  const [localOverrides, setLocalOverrides] = useState<Record<string, { state: string; note: string }>>({});

  const handleSubmitNote = async () => {
    if (!noteContent.trim()) return;
    setNoteSaving(true);
    setNoteError('');

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
      setTimeout(() => {
        setNoteSaved(false);
        setShowNote(false);
      }, 2000);
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setNoteSaving(false);
    }
  };

  const handleOverrideSave = async (unitId: string) => {
    const local = localOverrides[unitId];
    const newState = local?.state || '';
    const newNote = local?.note || '';

    setOverrideSaving(unitId);
    setOverrideError('');
    setOverrideSuccess(null);

    try {
      if (!newState) {
        // Clear override
        const res = await fetch('/api/teacher/unit-access', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, unitId }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to clear override');
        }
      } else {
        const res = await fetch('/api/teacher/unit-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            unitId,
            overrideState: newState,
            note: newNote,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to set override');
        }
      }

      setOverrideSuccess(unitId);
      setTimeout(() => setOverrideSuccess(null), 2000);
    } catch (err) {
      setOverrideError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setOverrideSaving(null);
    }
  };

  const getOverrideLocal = (unitId: string): { state: string; note: string } => {
    if (localOverrides[unitId]) return localOverrides[unitId];
    const existing = unitOverrides.find((u) => u.unitId === unitId);
    return {
      state: existing?.currentOverride || '',
      note: existing?.currentNote || '',
    };
  };

  const setOverrideField = (unitId: string, field: 'state' | 'note', value: string) => {
    setLocalOverrides((prev) => ({
      ...prev,
      [unitId]: { ...getOverrideLocal(unitId), [field]: value },
    }));
  };

  return (
    <>
      {/* Note Modal Overlay */}
      {showNote && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => { if (e.target === e.currentTarget) setShowNote(false); }}
        >
          <div className={styles.modalContent}>
            <h3 className={styles.cardTitle} style={{ marginBottom: 16 }}>📋 Add Note for {studentName}</h3>
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
              rows={4}
              style={{ marginTop: 10 }}
            />
            {noteError && <div className={styles.errorMsg}>{noteError}</div>}
            {noteSaved && <div className={styles.successMsg}>Note saved!</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button
                className={styles.smallBtn}
                style={{ padding: '10px 20px', fontSize: '0.88rem', background: '#f1f5f9', color: '#475569' }}
                onClick={() => { setShowNote(false); setNoteContent(''); setNoteError(''); }}
              >
                Cancel
              </button>
              <button
                className={styles.primaryBtn}
                style={{ width: 'auto', padding: '10px 24px' }}
                disabled={noteSaving || !noteContent.trim()}
                onClick={handleSubmitNote}
              >
                {noteSaving ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unit Override Modal */}
      {showOverride && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => { if (e.target === e.currentTarget) setShowOverride(false); }}
        >
          <div className={styles.modalContent} style={{ maxWidth: 640 }}>
            <h3 className={styles.cardTitle} style={{ marginBottom: 6 }}>📋 Manage Unit Access — {studentName}</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 16, lineHeight: 1.5 }}>
              Override unit access for this student. Use this for transfer students, intake placement, or acceleration.
              Changes only affect this student.
            </p>

            {overrideError && <div className={styles.errorMsg} style={{ marginBottom: 12 }}>{overrideError}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 440, overflowY: 'auto' }}>
              {unitOverrides.map((unit) => {
                const local = getOverrideLocal(unit.unitId);
                const isSaving = overrideSaving === unit.unitId;
                const isSuccess = overrideSuccess === unit.unitId;
                const hasOverride = !!local.state;

                return (
                  <div
                    key={unit.unitId}
                    style={{
                      border: `1px solid ${hasOverride ? '#93c5fd' : '#e2e8f0'}`,
                      borderRadius: 10,
                      padding: '12px 16px',
                      background: hasOverride ? '#eff6ff' : '#fafafa',
                    }}
                  >
                    {/* Unit header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '1.1rem' }}>{unit.unitIcon || '📖'}</span>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>{unit.unitTitle}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{unit.completionPct}% complete</div>
                        </div>
                      </div>
                      {isSuccess && (
                        <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>✓ Saved</span>
                      )}
                    </div>

                    {/* Override selector */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <select
                        style={{
                          flex: 1, minWidth: 200, padding: '8px 10px',
                          borderRadius: 6, border: '1px solid #e2e8f0',
                          fontSize: '0.82rem', background: '#fff',
                        }}
                        value={local.state}
                        onChange={(e) => setOverrideField(unit.unitId, 'state', e.target.value)}
                      >
                        {OVERRIDE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <button
                        className={styles.smallBtn}
                        style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                        disabled={isSaving}
                        onClick={() => handleOverrideSave(unit.unitId)}
                      >
                        {isSaving ? '...' : 'Apply'}
                      </button>
                    </div>

                    {/* Note / reason */}
                    {hasOverride && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                          {REASON_PRESETS.map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setOverrideField(unit.unitId, 'note', r)}
                              style={{
                                fontSize: '0.7rem', padding: '2px 8px',
                                borderRadius: 4, border: '1px solid #e2e8f0',
                                background: local.note === r ? '#dbeafe' : '#f8fafc',
                                color: local.note === r ? '#2563eb' : '#64748b',
                                cursor: 'pointer',
                              }}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Note / reason (optional)"
                          value={local.note}
                          onChange={(e) => setOverrideField(unit.unitId, 'note', e.target.value)}
                          style={{
                            width: '100%', padding: '6px 10px',
                            borderRadius: 6, border: '1px solid #e2e8f0',
                            fontSize: '0.82rem',
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                className={styles.smallBtn}
                style={{ padding: '10px 20px', fontSize: '0.88rem', background: '#f1f5f9', color: '#475569' }}
                onClick={() => setShowOverride(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          className={styles.smallBtn}
          style={{ padding: '10px 16px', fontSize: '0.88rem' }}
          onClick={() => setShowNote(true)}
        >
          📋 Add Note
        </button>
        {unitOverrides.length > 0 && (
          <button
            className={styles.smallBtn}
            style={{ padding: '10px 16px', fontSize: '0.88rem' }}
            onClick={() => setShowOverride(true)}
          >
            🔑 Manage Unit Access
          </button>
        )}
        <a
          href={`/teacher/submissions${contextQuery}`}
          className={styles.smallBtn}
          style={{ padding: '10px 16px', fontSize: '0.88rem', textDecoration: 'none', textAlign: 'center' }}
        >
          📝 Review Pending Work
        </a>
        <button
          className={styles.smallBtn}
          style={{ padding: '10px 16px', fontSize: '0.88rem' }}
          onClick={() => {
            const el = document.getElementById('outcomes-mastery');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          🎯 Assess Outcomes
        </button>
        <a
          href="/teacher/students"
          className={styles.smallBtn}
          style={{ padding: '10px 16px', fontSize: '0.88rem', textDecoration: 'none', textAlign: 'center' }}
        >
          ← Return to Students
        </a>
      </div>
    </>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import styles from '../../../../teacher.module.css';

interface Lesson {
  id: string;
  title: string;
  subtitle: string | null;
  order: number;
  activityCount: number;
}

interface UnitData {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  order: number;
}

interface CourseInfo {
  name: string;
  icon: string;
}

export default function UnitEditorPage() {
  const { courseId, unitId } = useParams<{ courseId: string; unitId: string }>();

  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [unit, setUnit] = useState<UnitData | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit unit state
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Add lesson state
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonSubtitle, setNewLessonSubtitle] = useState('');
  const [addingLesson, setAddingLesson] = useState(false);

  // Edit lesson inline
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editLessonTitle, setEditLessonTitle] = useState('');
  const [editLessonSubtitle, setEditLessonSubtitle] = useState('');

  const ICONS = ['🌿', '🌱', '🌡️', '🏗️', '📖', '🔬', '🔢', '🌍', '🎨', '🎵', '💻', '📐', '🧪', '🗺️',
    '✍️', '📊', '🔗', '🧬', '⚡', '🎯', '🗣️', '🔍', '✏️', '📏'];

  const fetchCourse = useCallback(async () => {
    try {
      const res = await fetch('/api/teacher/courses');
      if (res.ok) {
        const courses = await res.json();
        const found = courses.find((c: any) => c.id === courseId);
        if (found) setCourse({ name: found.name, icon: found.icon });
      }
    } catch (e) { console.error(e); }
  }, [courseId]);

  const fetchUnit = useCallback(async () => {
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/units`);
      if (res.ok) {
        const allUnits = await res.json();
        const found = allUnits.find((u: any) => u.id === unitId);
        if (found) {
          setUnit(found);
          setEditTitle(found.title);
          setEditDesc(found.description || '');
          setEditIcon(found.icon || '');
        }
      }
    } catch (e) { console.error(e); }
  }, [courseId, unitId]);

  const fetchLessons = useCallback(async () => {
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/units/${unitId}/lessons`);
      if (res.ok) {
        setLessons(await res.json());
      }
    } catch (e) { console.error(e); }
  }, [courseId, unitId]);

  useEffect(() => {
    Promise.all([fetchCourse(), fetchUnit(), fetchLessons()]).then(() => setLoading(false));
  }, [fetchCourse, fetchUnit, fetchLessons]);

  // Save unit metadata
  const handleSaveUnit = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/units/${unitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, description: editDesc || null, icon: editIcon || null }),
      });
      if (res.ok) {
        setSaveMsg('✓ Saved');
        fetchUnit();
        setTimeout(() => setSaveMsg(''), 2000);
      }
    } catch {
      setSaveMsg('⚠️ Failed');
    } finally {
      setSaving(false);
    }
  };

  // Add lesson
  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle.trim()) return;
    setAddingLesson(true);

    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/units/${unitId}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newLessonTitle.trim(), subtitle: newLessonSubtitle.trim() || null }),
      });
      if (res.ok) {
        setNewLessonTitle('');
        setNewLessonSubtitle('');
        setShowAddLesson(false);
        fetchLessons();
      }
    } catch (e) { console.error(e); }
    finally { setAddingLesson(false); }
  };

  // Delete lesson
  const handleDeleteLesson = async (lessonId: string, title: string) => {
    if (!confirm(`Delete lesson "${title}"?`)) return;
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/units/${unitId}/lessons/${lessonId}`, { method: 'DELETE' });
      if (res.ok) fetchLessons();
    } catch (e) { console.error(e); }
  };

  // Save lesson inline edit
  const handleSaveLesson = async (lessonId: string) => {
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/units/${unitId}/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editLessonTitle, subtitle: editLessonSubtitle || null }),
      });
      if (res.ok) {
        setEditingLessonId(null);
        fetchLessons();
      }
    } catch (e) { console.error(e); }
  };

  const startEditLesson = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setEditLessonTitle(lesson.title);
    setEditLessonSubtitle(lesson.subtitle || '');
  };

  if (loading) {
    return (
      <div className={styles.dashCard} style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: '#64748b' }}>Loading unit...</p>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className={styles.dashCard} style={{ textAlign: 'center', padding: 40 }}>
        <h3 style={{ color: '#dc2626' }}>Unit not found</h3>
        <Link href={`/teacher/courses/${courseId}`} style={{ color: '#2563eb' }}>← Back to course</Link>
      </div>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20, fontSize: '0.82rem', color: '#94a3b8' }}>
        <Link href="/teacher/courses" style={{ color: '#94a3b8', textDecoration: 'none' }}>Course Builder</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <Link href={`/teacher/courses/${courseId}`} style={{ color: '#94a3b8', textDecoration: 'none' }}>
          {course?.icon} {course?.name}
        </Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: '#475569', fontWeight: 600 }}>{unit.icon} {unit.title}</span>
      </div>

      {/* ===== Unit Settings ===== */}
      <div className={styles.dashCard} style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>
          📝 Unit Settings
        </h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={labelStyle}>Unit Title</label>
            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: '0 0 80px' }}>
            <label style={labelStyle}>Icon</label>
            <select value={editIcon} onChange={(e) => setEditIcon(e.target.value)} style={inputStyle}>
              <option value="">—</option>
              {ICONS.map((i) => (<option key={i} value={i}>{i}</option>))}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Description <span style={{ color: '#94a3b8' }}>(optional)</span></label>
          <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Describe what students will learn in this unit" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleSaveUnit} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
          {saveMsg && <span style={{ fontSize: '0.82rem', color: saveMsg.includes('✓') ? '#059669' : '#dc2626', fontWeight: 600 }}>{saveMsg}</span>}
        </div>
      </div>

      {/* ===== Lessons Section ===== */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
          📄 Lessons ({lessons.length})
        </h3>
        <button
          onClick={() => setShowAddLesson(!showAddLesson)}
          style={{
            padding: '8px 16px', fontSize: '0.82rem', fontWeight: 600,
            color: showAddLesson ? '#64748b' : '#fff',
            background: showAddLesson ? '#f1f5f9' : '#059669',
            border: 'none', borderRadius: 8, cursor: 'pointer',
          }}
        >
          {showAddLesson ? '✕ Cancel' : '+ Add Lesson'}
        </button>
      </div>

      {/* Add Lesson Form */}
      {showAddLesson && (
        <div className={styles.dashCard} style={{ marginBottom: 16, borderLeft: '4px solid #059669' }}>
          <form onSubmit={handleAddLesson} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={labelStyle}>Lesson Title</label>
              <input type="text" value={newLessonTitle} onChange={(e) => setNewLessonTitle(e.target.value)} placeholder="e.g. Introduction to Ecosystems" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Subtitle <span style={{ color: '#94a3b8' }}>(optional)</span></label>
              <input type="text" value={newLessonSubtitle} onChange={(e) => setNewLessonSubtitle(e.target.value)} placeholder="Brief description of this lesson" style={inputStyle} />
            </div>
            <button type="submit" disabled={addingLesson || !newLessonTitle.trim()} style={{ ...btnPrimary, background: addingLesson ? '#94a3b8' : '#059669', alignSelf: 'flex-start' }}>
              {addingLesson ? 'Adding...' : '✓ Add Lesson'}
            </button>
          </form>
        </div>
      )}

      {/* Lesson List */}
      {lessons.length === 0 ? (
        <div className={styles.dashCard} style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No lessons yet. Add your first lesson above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lessons.map((lesson, i) => (
            <div
              key={lesson.id}
              className={styles.dashCard}
              style={{ borderLeft: '4px solid #059669' }}
            >
              {editingLessonId === lesson.id ? (
                /* Inline Edit Mode */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={labelStyle}>Title</label>
                      <input type="text" value={editLessonTitle} onChange={(e) => setEditLessonTitle(e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Subtitle</label>
                    <input type="text" value={editLessonSubtitle} onChange={(e) => setEditLessonSubtitle(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleSaveLesson(lesson.id)} style={{ ...btnPrimary, background: '#059669', fontSize: '0.78rem', padding: '6px 14px' }}>
                      ✓ Save
                    </button>
                    <button onClick={() => setEditingLessonId(null)} style={{ padding: '6px 14px', fontSize: '0.78rem', color: '#64748b', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Display Mode */
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: '#059669', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.82rem', flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                      {lesson.title}
                    </h4>
                    {lesson.subtitle && (
                      <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '2px 0 0' }}>{lesson.subtitle}</p>
                    )}
                    <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '3px 0 0' }}>
                      {lesson.activityCount} activit{lesson.activityCount !== 1 ? 'ies' : 'y'} · Order: {lesson.order}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Link
                      href={`/teacher/courses/${courseId}/units/${unitId}/lessons/${lesson.id}`}
                      style={{
                        padding: '5px 10px', fontSize: '0.75rem', fontWeight: 600,
                        color: '#059669', background: '#f0fdf4',
                        border: '1px solid #bbf7d0', borderRadius: 6,
                        textDecoration: 'none',
                      }}
                    >
                      📝 Content
                    </Link>
                    <button
                      onClick={() => startEditLesson(lesson)}
                      style={{
                        padding: '5px 10px', fontSize: '0.75rem', fontWeight: 600,
                        color: '#2563eb', background: '#eff6ff',
                        border: '1px solid #dbeafe', borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                      style={{
                        padding: '5px 10px', fontSize: '0.75rem',
                        color: '#dc2626', background: '#fef2f2',
                        border: '1px solid #fecaca', borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.78rem', fontWeight: 600,
  color: '#475569', marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: '0.88rem',
  border: '1.5px solid #e2e8f0', borderRadius: 8,
  outline: 'none', boxSizing: 'border-box',
};

const btnPrimary: React.CSSProperties = {
  padding: '8px 18px', fontSize: '0.82rem', fontWeight: 700,
  color: '#fff', background: '#2563eb', border: 'none',
  borderRadius: 8, cursor: 'pointer',
};

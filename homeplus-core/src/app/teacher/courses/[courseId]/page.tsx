'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../../teacher.module.css';

interface Unit {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  order: number;
  lessonCount: number;
}

interface CourseData {
  id: string;
  name: string;
  icon: string;
  gradeLevel: number;
  active: boolean;
}

export default function CourseEditorPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();

  const [course, setCourse] = useState<CourseData | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit course state
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editGrade, setEditGrade] = useState(7);
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Add unit state
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [newUnitDesc, setNewUnitDesc] = useState('');
  const [newUnitIcon, setNewUnitIcon] = useState('');
  const [addingUnit, setAddingUnit] = useState(false);

  const ICONS = ['📚', '🔬', '📖', '🔢', '🌍', '🎨', '🎵', '🏃', '💻', '📐', '🧪', '🗺️', '✍️', '📊',
    '🌿', '🌱', '🌡️', '🏗️', '🔗', '🧬', '⚡', '🎯', '🗣️', '🔍', '✏️', '📏'];

  const fetchCourse = useCallback(async () => {
    try {
      // Fetch course list and find this one
      const res = await fetch('/api/teacher/courses');
      if (res.ok) {
        const allCourses = await res.json();
        const found = allCourses.find((c: any) => c.id === courseId);
        if (found) {
          setCourse(found);
          setEditName(found.name);
          setEditIcon(found.icon);
          setEditGrade(found.gradeLevel);
          setEditActive(found.active);
        }
      }
    } catch (e) {
      console.error('Failed to fetch course:', e);
    }
  }, [courseId]);

  const fetchUnits = useCallback(async () => {
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/units`);
      if (res.ok) {
        setUnits(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch units:', e);
    }
  }, [courseId]);

  useEffect(() => {
    Promise.all([fetchCourse(), fetchUnits()]).then(() => setLoading(false));
  }, [fetchCourse, fetchUnits]);

  // Save course metadata
  const handleSaveCourse = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, icon: editIcon, gradeLevel: editGrade, active: editActive }),
      });
      if (res.ok) {
        setSaveMsg('✓ Saved');
        fetchCourse();
        setTimeout(() => setSaveMsg(''), 2000);
      }
    } catch {
      setSaveMsg('⚠️ Failed');
    } finally {
      setSaving(false);
    }
  };

  // Add unit
  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitTitle.trim()) return;
    setAddingUnit(true);

    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newUnitTitle.trim(),
          description: newUnitDesc.trim() || null,
          icon: newUnitIcon || null,
        }),
      });

      if (res.ok) {
        setNewUnitTitle('');
        setNewUnitDesc('');
        setNewUnitIcon('');
        setShowAddUnit(false);
        fetchUnits();
      }
    } catch (e) {
      console.error('Failed to add unit:', e);
    } finally {
      setAddingUnit(false);
    }
  };

  // Delete unit
  const handleDeleteUnit = async (unitId: string, unitTitle: string) => {
    if (!confirm(`Delete "${unitTitle}"? This will also delete all lessons in this unit.`)) return;

    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/units/${unitId}`, { method: 'DELETE' });
      if (res.ok) fetchUnits();
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  if (loading) {
    return (
      <div className={styles.dashCard} style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: '#64748b' }}>Loading course...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className={styles.dashCard} style={{ textAlign: 'center', padding: 40 }}>
        <h3 style={{ color: '#dc2626' }}>Course not found</h3>
        <Link href="/teacher/courses" style={{ color: '#2563eb' }}>← Back to courses</Link>
      </div>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20, fontSize: '0.82rem', color: '#94a3b8' }}>
        <Link href="/teacher/courses" style={{ color: '#94a3b8', textDecoration: 'none' }}>
          Course Builder
        </Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: '#475569', fontWeight: 600 }}>{course.icon} {course.name}</span>
      </div>

      {/* ===== Course Meta Editor ===== */}
      <div className={styles.dashCard} style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>
          📝 Course Settings
        </h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={labelStyle}>Course Name</label>
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: '0 0 120px' }}>
            <label style={labelStyle}>Grade</label>
            <select value={editGrade} onChange={(e) => setEditGrade(Number(e.target.value))} style={inputStyle}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '0 0 100px' }}>
            <label style={labelStyle}>Icon</label>
            <select value={editIcon} onChange={(e) => setEditIcon(e.target.value)} style={inputStyle}>
              {ICONS.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '0 0 120px' }}>
            <label style={labelStyle}>Status</label>
            <select value={editActive ? 'active' : 'draft'} onChange={(e) => setEditActive(e.target.value === 'active')} style={inputStyle}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleSaveCourse} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
          {saveMsg && <span style={{ fontSize: '0.82rem', color: saveMsg.includes('✓') ? '#059669' : '#dc2626', fontWeight: 600 }}>{saveMsg}</span>}
        </div>
      </div>

      {/* ===== Units Section ===== */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
          📋 Units ({units.length})
        </h3>
        <button
          onClick={() => setShowAddUnit(!showAddUnit)}
          style={{
            padding: '8px 16px', fontSize: '0.82rem', fontWeight: 600,
            color: showAddUnit ? '#64748b' : '#fff',
            background: showAddUnit ? '#f1f5f9' : '#2563eb',
            border: 'none', borderRadius: 8, cursor: 'pointer',
          }}
        >
          {showAddUnit ? '✕ Cancel' : '+ Add Unit'}
        </button>
      </div>

      {/* Add Unit Form */}
      {showAddUnit && (
        <div className={styles.dashCard} style={{ marginBottom: 16, borderLeft: '4px solid #059669' }}>
          <form onSubmit={handleAddUnit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={labelStyle}>Unit Title</label>
                <input type="text" value={newUnitTitle} onChange={(e) => setNewUnitTitle(e.target.value)} placeholder="e.g. Interactions & Ecosystems" required style={inputStyle} />
              </div>
              <div style={{ flex: '0 0 80px' }}>
                <label style={labelStyle}>Icon</label>
                <select value={newUnitIcon} onChange={(e) => setNewUnitIcon(e.target.value)} style={inputStyle}>
                  <option value="">—</option>
                  {ICONS.map((i) => (<option key={i} value={i}>{i}</option>))}
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Description <span style={{ color: '#94a3b8' }}>(optional)</span></label>
              <input type="text" value={newUnitDesc} onChange={(e) => setNewUnitDesc(e.target.value)} placeholder="Brief description of this unit" style={inputStyle} />
            </div>
            <button type="submit" disabled={addingUnit || !newUnitTitle.trim()} style={{ ...btnPrimary, background: addingUnit ? '#94a3b8' : '#059669', alignSelf: 'flex-start' }}>
              {addingUnit ? 'Adding...' : '✓ Add Unit'}
            </button>
          </form>
        </div>
      )}

      {/* Unit Cards */}
      {units.length === 0 ? (
        <div className={styles.dashCard} style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No units yet. Add your first unit above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {units.map((unit, i) => (
            <div
              key={unit.id}
              className={styles.dashCard}
              style={{ borderLeft: '4px solid #2563eb' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: '#2563eb', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.88rem', flexShrink: 0,
                }}>
                  {unit.icon || (i + 1)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                    {unit.title}
                  </h4>
                  {unit.description && (
                    <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0' }}>{unit.description}</p>
                  )}
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0' }}>
                    {unit.lessonCount} lesson{unit.lessonCount !== 1 ? 's' : ''} · Order: {unit.order}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Link
                    href={`/teacher/courses/${courseId}/units/${unit.id}`}
                    style={{
                      padding: '6px 14px', fontSize: '0.78rem', fontWeight: 600,
                      color: '#2563eb', background: '#eff6ff',
                      border: '1px solid #dbeafe', borderRadius: 6,
                      textDecoration: 'none',
                    }}
                  >
                    ✏️ Edit
                  </Link>
                  <button
                    onClick={() => handleDeleteUnit(unit.id, unit.title)}
                    style={{
                      padding: '6px 10px', fontSize: '0.78rem',
                      color: '#dc2626', background: '#fef2f2',
                      border: '1px solid #fecaca', borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
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

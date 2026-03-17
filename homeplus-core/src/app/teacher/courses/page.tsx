'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from '../teacher.module.css';

interface Course {
  id: string;
  name: string;
  icon: string;
  gradeLevel: number;
  order: number;
  active: boolean;
  unitCount: number;
  lessonCount: number;
}

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGrade, setNewGrade] = useState(7);
  const [newIcon, setNewIcon] = useState('📚');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchCourses = useCallback(async () => {
    try {
      const res = await fetch('/api/teacher/courses');
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
      }
    } catch (e) {
      console.error('Failed to fetch courses:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError('');

    try {
      const res = await fetch('/api/teacher/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), gradeLevel: newGrade, icon: newIcon }),
      });

      if (res.ok) {
        setNewName('');
        setNewGrade(7);
        setNewIcon('📚');
        setShowForm(false);
        fetchCourses();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create course');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (courseId: string, courseName: string) => {
    if (!confirm(`Are you sure you want to delete "${courseName}"? This will delete all units and lessons within it.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/teacher/courses/${courseId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCourses();
      }
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  // Group courses by grade level
  const coursesByGrade = courses.reduce<Record<number, Course[]>>((acc, c) => {
    if (!acc[c.gradeLevel]) acc[c.gradeLevel] = [];
    acc[c.gradeLevel].push(c);
    return acc;
  }, {});

  const ICONS = ['📚', '🔬', '📖', '🔢', '🌍', '🎨', '🎵', '🏃', '💻', '📐', '🧪', '🗺️', '✍️', '📊'];

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>
            📚 Course Builder
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
            Create and manage courses, units, and lessons
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 20px',
            fontSize: '0.88rem',
            fontWeight: 700,
            color: '#fff',
            background: showForm ? '#64748b' : '#2563eb',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {showForm ? '✕ Cancel' : '+ New Course'}
        </button>
      </div>

      {/* Create Course Form */}
      {showForm && (
        <div className={styles.dashCard} style={{ marginBottom: 24, borderLeft: '4px solid #2563eb' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>
            Create New Course
          </h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={labelStyle}>Course Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Science"
                  required
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: '0 0 120px' }}>
                <label style={labelStyle}>Grade Level</label>
                <select value={newGrade} onChange={(e) => setNewGrade(Number(e.target.value))} style={inputStyle}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: '0 0 100px' }}>
                <label style={labelStyle}>Icon</label>
                <select value={newIcon} onChange={(e) => setNewIcon(e.target.value)} style={inputStyle}>
                  {ICONS.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.82rem', color: '#dc2626' }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={creating || !newName.trim()}
              style={{
                padding: '10px 20px',
                fontSize: '0.88rem',
                fontWeight: 700,
                color: '#fff',
                background: creating ? '#94a3b8' : '#059669',
                border: 'none',
                borderRadius: 10,
                cursor: creating ? 'not-allowed' : 'pointer',
                alignSelf: 'flex-start',
              }}
            >
              {creating ? 'Creating...' : '✓ Create Course'}
            </button>
          </form>
        </div>
      )}

      {/* Course List */}
      {loading ? (
        <div className={styles.dashCard} style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#64748b' }}>Loading courses...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className={styles.dashCard} style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
            No courses yet
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Click &quot;+ New Course&quot; above to create your first course.
          </p>
        </div>
      ) : (
        Object.entries(coursesByGrade)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([grade, gradeCoursesArr]) => (
            <div key={grade} style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Grade {grade}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {gradeCoursesArr.map((course) => (
                  <div key={course.id} className={styles.dashCard} style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10,
                        background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.3rem', flexShrink: 0,
                      }}>
                        {course.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#1e293b', margin: '0 0 2px' }}>
                          {course.name}
                        </h4>
                        <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                          {course.unitCount} unit{course.unitCount !== 1 ? 's' : ''} · {course.lessonCount} lesson{course.lessonCount !== 1 ? 's' : ''}
                        </p>
                        {!course.active && (
                          <span style={{
                            display: 'inline-block', marginTop: 4,
                            padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600,
                            background: '#fef3c7', color: '#d97706', borderRadius: 6,
                          }}>
                            Draft
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <Link
                        href={`/teacher/courses/${course.id}`}
                        style={{
                          flex: 1, textAlign: 'center',
                          padding: '8px 14px', fontSize: '0.82rem', fontWeight: 600,
                          color: '#2563eb', background: '#eff6ff',
                          border: '1px solid #dbeafe', borderRadius: 8,
                          textDecoration: 'none', transition: 'background 0.15s',
                        }}
                      >
                        ✏️ Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(course.id, course.name)}
                        style={{
                          padding: '8px 14px', fontSize: '0.82rem', fontWeight: 600,
                          color: '#dc2626', background: '#fef2f2',
                          border: '1px solid #fecaca', borderRadius: 8,
                          cursor: 'pointer', transition: 'background 0.15s',
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
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

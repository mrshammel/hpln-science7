'use client';

// ============================================
// Teacher Lesson Editor — Home Plus LMS
// ============================================
// Structured block-based lesson authoring.
// Teachers can configure all 6 sections of the universal lesson frame.

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import styles from '../../../../../../teacher.module.css';
import {
  SECTION_ORDER,
  SECTION_LABELS,
  SECTION_ICONS,
  BLOCK_TYPE_LABELS,
  BLOCK_TYPE_ICONS,
  DEFAULT_MASTERY_CONFIG,
  type LessonSectionType,
  type BlockType,
  type SubjectMode,
} from '@/lib/lesson-types';

interface Block {
  id: string;
  section: LessonSectionType;
  blockType: BlockType;
  content: any;
  order: number;
}

interface LessonData {
  id: string;
  title: string;
  subtitle: string | null;
  estimatedMinutes: number | null;
  learningGoal: string | null;
  successCriteria: string | null;
  materials: string | null;
  subjectMode: SubjectMode;
  reflectionPrompt: string | null;
  masteryConfig: any;
}

const SUBJECT_MODES: SubjectMode[] = ['GENERAL', 'SCIENCE', 'ELA', 'MATH', 'SOCIAL_STUDIES'];

// Which block types make sense in which sections
const SECTION_BLOCK_TYPES: Record<LessonSectionType, BlockType[]> = {
  WARM_UP: ['TEXT', 'MULTIPLE_CHOICE', 'FILL_IN_BLANK', 'MATCHING', 'IMAGE'],
  LEARN: ['TEXT', 'VIDEO', 'IMAGE', 'AI_SUMMARY', 'VOCABULARY', 'WORKED_EXAMPLE', 'MICRO_CHECK'],
  PRACTICE: [
    'TEXT', 'FILL_IN_BLANK', 'MATCHING', 'MULTIPLE_CHOICE', 'CONSTRUCTED_RESPONSE',
    'DRAWING', 'PHOTO_UPLOAD', 'TAKE_PHOTO', 'VIDEO_UPLOAD', 'TAKE_VIDEO', 'FILE_UPLOAD',
    'WORKED_EXAMPLE', 'IMAGE',
  ],
  CHECK: ['TEXT', 'MULTIPLE_CHOICE', 'FILL_IN_BLANK', 'CONSTRUCTED_RESPONSE'],
  REFLECT: ['TEXT', 'CONSTRUCTED_RESPONSE'],
};

export default function TeacherLessonEditorPage() {
  const { courseId, unitId, lessonId } = useParams<{ courseId: string; unitId: string; lessonId: string }>();

  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Edit lesson meta
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editMinutes, setEditMinutes] = useState<number>(15);
  const [editGoal, setEditGoal] = useState('');
  const [editCriteria, setEditCriteria] = useState('');
  const [editMaterials, setEditMaterials] = useState('');
  const [editMode, setEditMode] = useState<SubjectMode>('GENERAL');
  const [editReflection, setEditReflection] = useState('');

  // Add block
  const [addingSection, setAddingSection] = useState<LessonSectionType | null>(null);
  const [addBlockType, setAddBlockType] = useState<BlockType>('TEXT');

  // Edit block
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [editBlockContent, setEditBlockContent] = useState('');

  const apiBase = `/api/teacher/courses/${courseId}/units/${unitId}/lessons/${lessonId}`;

  const fetchLesson = useCallback(async () => {
    try {
      // Fetch from lesson detail API
      const res = await fetch(`/api/teacher/courses/${courseId}/units/${unitId}/lessons`);
      if (res.ok) {
        const all = await res.json();
        const found = all.find((l: any) => l.id === lessonId);
        if (found) {
          setLesson(found);
          setEditTitle(found.title || '');
          setEditSubtitle(found.subtitle || '');
          setEditMinutes(found.estimatedMinutes || 15);
          setEditGoal(found.learningGoal || '');
          setEditCriteria(found.successCriteria || '');
          setEditMaterials(found.materials || '');
          setEditMode(found.subjectMode || 'GENERAL');
          setEditReflection(found.reflectionPrompt || '');
        }
      }
    } catch (e) { console.error(e); }
  }, [courseId, unitId, lessonId]);

  const fetchBlocks = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/blocks`);
      if (res.ok) setBlocks(await res.json());
    } catch (e) { console.error(e); }
  }, [apiBase]);

  useEffect(() => {
    Promise.all([fetchLesson(), fetchBlocks()]).then(() => setLoading(false));
  }, [fetchLesson, fetchBlocks]);

  // Save lesson metadata
  const handleSaveMeta = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/units/${unitId}/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          subtitle: editSubtitle || null,
          estimatedMinutes: editMinutes || null,
          learningGoal: editGoal || null,
          successCriteria: editCriteria || null,
          materials: editMaterials || null,
          subjectMode: editMode,
          reflectionPrompt: editReflection || null,
        }),
      });
      if (res.ok) {
        setSaveMsg('✓ Saved');
        fetchLesson();
        setTimeout(() => setSaveMsg(''), 2000);
      }
    } catch {
      setSaveMsg('⚠️ Failed');
    } finally {
      setSaving(false);
    }
  };

  // Add block
  const handleAddBlock = async (section: LessonSectionType) => {
    try {
      const defaultContent = getDefaultContent(addBlockType);
      const res = await fetch(`${apiBase}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, blockType: addBlockType, content: defaultContent }),
      });
      if (res.ok) {
        setAddingSection(null);
        fetchBlocks();
      }
    } catch (e) { console.error(e); }
  };

  // Update block content
  const handleSaveBlock = async (blockId: string) => {
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(editBlockContent);
      } catch {
        setSaveMsg('⚠️ Invalid JSON');
        return;
      }
      const res = await fetch(`${apiBase}/blocks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId, content: parsed }),
      });
      if (res.ok) {
        setEditingBlock(null);
        fetchBlocks();
      }
    } catch (e) { console.error(e); }
  };

  // Delete block
  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('Delete this block?')) return;
    try {
      const res = await fetch(`${apiBase}/blocks?blockId=${blockId}`, { method: 'DELETE' });
      if (res.ok) fetchBlocks();
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return <div className={styles.dashCard} style={{ textAlign: 'center', padding: 40 }}>
      <p style={{ color: '#64748b' }}>Loading lesson editor...</p>
    </div>;
  }

  const blocksBySection: Record<LessonSectionType, Block[]> = {
    WARM_UP: [], LEARN: [], PRACTICE: [], CHECK: [], REFLECT: [],
  };
  for (const b of blocks) {
    if (blocksBySection[b.section]) blocksBySection[b.section].push(b);
  }

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20, fontSize: '0.82rem', color: '#94a3b8' }}>
        <Link href="/teacher/courses" style={{ color: '#94a3b8', textDecoration: 'none' }}>Course Builder</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <Link href={`/teacher/courses/${courseId}`} style={{ color: '#94a3b8', textDecoration: 'none' }}>Course</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <Link href={`/teacher/courses/${courseId}/units/${unitId}`} style={{ color: '#94a3b8', textDecoration: 'none' }}>Unit</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: '#475569', fontWeight: 600 }}>{editTitle || 'Lesson'}</span>
      </div>

      {/* ===== Lesson Metadata ===== */}
      <div className={styles.dashCard} style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>
          📝 Lesson Settings
        </h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ flex: '1 1 250px' }}>
            <label style={labelStyle}>Lesson Title</label>
            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: '0 0 100px' }}>
            <label style={labelStyle}>Minutes</label>
            <input type="number" value={editMinutes} onChange={(e) => setEditMinutes(Number(e.target.value))} style={inputStyle} />
          </div>
          <div style={{ flex: '0 0 150px' }}>
            <label style={labelStyle}>Subject Mode</label>
            <select value={editMode} onChange={(e) => setEditMode(e.target.value as SubjectMode)} style={inputStyle}>
              {SUBJECT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Learning Goal</label>
          <input type="text" value={editGoal} onChange={(e) => setEditGoal(e.target.value)} placeholder="What students will learn..." style={inputStyle} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Success Criteria <span style={{ color: '#94a3b8' }}>(one per line)</span></label>
          <textarea value={editCriteria} onChange={(e) => setEditCriteria(e.target.value)} rows={3} placeholder="- I can explain..." style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={labelStyle}>Subtitle <span style={{ color: '#94a3b8' }}>(optional)</span></label>
            <input type="text" value={editSubtitle} onChange={(e) => setEditSubtitle(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={labelStyle}>Materials <span style={{ color: '#94a3b8' }}>(optional)</span></label>
            <input type="text" value={editMaterials} onChange={(e) => setEditMaterials(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Reflection Prompt <span style={{ color: '#94a3b8' }}>(optional)</span></label>
          <input type="text" value={editReflection} onChange={(e) => setEditReflection(e.target.value)} placeholder="What is one important thing you learned?" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleSaveMeta} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : '💾 Save Settings'}
          </button>
          {saveMsg && <span style={{ fontSize: '0.82rem', color: saveMsg.includes('✓') ? '#059669' : '#dc2626', fontWeight: 600 }}>{saveMsg}</span>}
        </div>
      </div>

      {/* ===== Lesson Sections & Blocks ===== */}
      {SECTION_ORDER.map((section) => (
        <div key={section} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              {SECTION_ICONS[section]} {SECTION_LABELS[section]} ({blocksBySection[section].length})
            </h3>
            <button
              onClick={() => setAddingSection(addingSection === section ? null : section)}
              style={{
                padding: '6px 14px', fontSize: '0.78rem', fontWeight: 600,
                color: addingSection === section ? '#64748b' : '#fff',
                background: addingSection === section ? '#f1f5f9' : '#2563eb',
                border: 'none', borderRadius: 6, cursor: 'pointer',
              }}
            >
              {addingSection === section ? '✕ Cancel' : '+ Add Block'}
            </button>
          </div>

          {/* Add block form */}
          {addingSection === section && (
            <div className={styles.dashCard} style={{ borderLeft: '4px solid #2563eb', marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={labelStyle}>Block Type</label>
                  <select
                    value={addBlockType}
                    onChange={(e) => setAddBlockType(e.target.value as BlockType)}
                    style={inputStyle}
                  >
                    {SECTION_BLOCK_TYPES[section].map((bt) => (
                      <option key={bt} value={bt}>{BLOCK_TYPE_ICONS[bt]} {BLOCK_TYPE_LABELS[bt]}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => handleAddBlock(section)}
                  style={{ ...btnPrimary, background: '#059669', padding: '8px 16px', fontSize: '0.82rem' }}
                >
                  ✓ Add
                </button>
              </div>
            </div>
          )}

          {/* Block list */}
          {blocksBySection[section].length === 0 ? (
            <div style={{ padding: '16px 20px', border: '1px dashed #e2e8f0', borderRadius: 10, textAlign: 'center' }}>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0 }}>No blocks yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {blocksBySection[section].map((block) => (
                <div key={block.id} className={styles.dashCard} style={{ borderLeft: '4px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
                        {BLOCK_TYPE_ICONS[block.blockType]} {BLOCK_TYPE_LABELS[block.blockType]}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: 8 }}>
                        #{block.order}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => {
                          setEditingBlock(editingBlock === block.id ? null : block.id);
                          setEditBlockContent(JSON.stringify(block.content, null, 2));
                        }}
                        style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#2563eb', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 6, cursor: 'pointer' }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBlock(block.id)}
                        style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Inline JSON editor */}
                  {editingBlock === block.id && (
                    <div style={{ marginTop: 10 }}>
                      <textarea
                        value={editBlockContent}
                        onChange={(e) => setEditBlockContent(e.target.value)}
                        rows={8}
                        style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.78rem', resize: 'vertical' }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        <button onClick={() => handleSaveBlock(block.id)} style={{ ...btnPrimary, fontSize: '0.78rem', padding: '6px 14px', background: '#059669' }}>
                          ✓ Save
                        </button>
                        <button onClick={() => setEditingBlock(null)} style={{ padding: '6px 14px', fontSize: '0.78rem', color: '#64748b', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Preview snippet */}
                  {editingBlock !== block.id && (
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '6px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 500 }}>
                      {getPreview(block.blockType, block.content)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

// ---- Helpers ----

function getDefaultContent(blockType: BlockType): any {
  switch (blockType) {
    case 'TEXT': return { html: '<p>Enter your content here...</p>' };
    case 'VIDEO': return { url: '', title: '' };
    case 'IMAGE': return { url: '', alt: '', caption: '' };
    case 'AI_SUMMARY': return { summary: '' };
    case 'VOCABULARY': return { terms: [{ term: '', definition: '' }] };
    case 'WORKED_EXAMPLE': return { title: '', steps: [{ instruction: '' }] };
    case 'FILL_IN_BLANK': return { prompt: '', blanks: [{ id: '1', correctAnswer: '' }] };
    case 'MATCHING': return { instruction: 'Match the items:', pairs: [{ left: '', right: '' }] };
    case 'MULTIPLE_CHOICE': return { question: '', options: [{ label: '', value: 'a' }, { label: '', value: 'b' }] };
    case 'CONSTRUCTED_RESPONSE': return { prompt: '', teacherReviewRequired: true };
    case 'DRAWING': return { instruction: '' };
    case 'PHOTO_UPLOAD': case 'TAKE_PHOTO': return { instruction: 'Upload a photo of your work' };
    case 'VIDEO_UPLOAD': case 'TAKE_VIDEO': return { instruction: 'Upload a video response' };
    case 'FILE_UPLOAD': return { instruction: 'Upload your file', acceptedTypes: ['image/*', '.pdf'] };
    case 'MICRO_CHECK': return { question: '', options: [{ label: '', value: 'a' }, { label: '', value: 'b' }] };
    default: return {};
  }
}

function getPreview(blockType: BlockType, content: any): string {
  if (!content) return '(empty)';
  switch (blockType) {
    case 'TEXT': return (content.html || '').replace(/<[^>]*>/g, '').slice(0, 80);
    case 'VIDEO': return content.url || '(no URL)';
    case 'IMAGE': return content.alt || content.url || '(no image)';
    case 'AI_SUMMARY': return (content.summary || '').slice(0, 80);
    case 'VOCABULARY': return (content.terms || []).map((t: any) => t.term).join(', ') || '(no terms)';
    case 'MULTIPLE_CHOICE': case 'MICRO_CHECK': return content.question || '(no question)';
    case 'FILL_IN_BLANK': return content.prompt || '(no prompt)';
    case 'MATCHING': return content.instruction || '(matching)';
    case 'CONSTRUCTED_RESPONSE': return content.prompt || '(no prompt)';
    case 'WORKED_EXAMPLE': return content.title || '(no title)';
    default: return JSON.stringify(content).slice(0, 60);
  }
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

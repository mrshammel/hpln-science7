import styles from '../teacher.module.css';
import { getTeacherNotes } from '@/lib/teacher-data';
import { getTeacherId } from '@/lib/teacher-auth';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NotesPage({ searchParams }: PageProps) {
  const _params = await searchParams; // Accept context for URL consistency
  const teacherId = await getTeacherId();
  const notes = await getTeacherNotes(teacherId);

  const tagColors: Record<string, { bg: string; color: string }> = {
    'Needs Check-In': { bg: '#fee2e2', color: '#dc2626' },
    'Parent Contacted': { bg: '#dbeafe', color: '#2563eb' },
    'Reading Support': { bg: '#fef3c7', color: '#d97706' },
    'Tech Issue': { bg: '#f3f4f6', color: '#6b7280' },
    'Frequent Retry': { bg: '#ede9fe', color: '#7c3aed' },
    'Extension Candidate': { bg: '#d1fae5', color: '#059669' },
    'General': { bg: '#f1f5f9', color: '#475569' },
  };

  return (
    <>
      {/* Controls */}
      <div className={styles.tableControls}>
        <button className={styles.smallBtn} style={{ padding: '10px 18px', fontSize: '0.88rem' }}>
          + Add Note
        </button>
        <select className={styles.filterSelect}>
          <option value="">All Tags</option>
          <option value="Needs Check-In">Needs Check-In</option>
          <option value="Parent Contacted">Parent Contacted</option>
          <option value="Reading Support">Reading Support</option>
          <option value="Tech Issue">Tech Issue</option>
          <option value="Frequent Retry">Frequent Retry</option>
          <option value="Extension Candidate">Extension Candidate</option>
        </select>
      </div>

      {/* Notes List */}
      <div className={styles.dashCard}>
        {notes.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <div className={styles.emptyTitle}>No notes yet</div>
            <div className={styles.emptyDesc}>
              Add notes about students to track check-ins, parent contacts, and observations. Notes help you keep a running record of important student interactions.
            </div>
          </div>
        ) : (
          notes.map((note) => {
            const tagStyle = tagColors[note.tag] || tagColors['General'];
            return (
              <div key={note.id} className={styles.submissionItem}>
                <div className={styles.attentionAvatar}>
                  {note.studentName.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div className={styles.submissionInfo}>
                  <div className={styles.submissionStudent}>{note.studentName}</div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: 4, lineHeight: 1.5 }}>
                    {note.content}
                  </div>
                </div>
                <span
                  className={styles.pacingBadge}
                  style={{ background: tagStyle.bg, color: tagStyle.color }}
                >
                  {note.tag}
                </span>
                <div className={styles.submissionDate}>
                  {new Date(note.createdAt).toLocaleDateString('en-CA', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

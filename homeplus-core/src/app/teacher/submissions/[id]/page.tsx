import Link from 'next/link';
import styles from '../../teacher.module.css';
import { getSubmissionById } from '@/lib/teacher-data';
import { getOutcomesForContext } from '@/lib/evidence-data';
import { getTeacherId } from '@/lib/teacher-auth';
import { resolveContext, buildContextQuery } from '@/lib/teacher-context';
import { getInitials, formatDate } from '@/lib/helpers';
import ReviewActions from './ReviewActions';

// ---------- Types ----------

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// ---------- Submission Type Labels ----------

const TYPE_LABELS: Record<string, string> = {
  QUIZ_RESPONSE: 'Quiz Response',
  SHORT_ANSWER: 'Short Answer',
  PARAGRAPH_RESPONSE: 'Paragraph Response',
  ESSAY: 'Essay / Reflection',
  REFLECTION: 'Reflection',
  UPLOADED_WORKSHEET: 'Uploaded Worksheet',
  IMAGE_ARTIFACT: 'Image Artifact',
  PROJECT_FILE: 'Project File',
  PORTFOLIO_EVIDENCE: 'Portfolio Evidence',
};

const TYPE_ICONS: Record<string, string> = {
  QUIZ_RESPONSE: '📝',
  SHORT_ANSWER: '✏️',
  PARAGRAPH_RESPONSE: '📄',
  ESSAY: '📖',
  REFLECTION: '💭',
  UPLOADED_WORKSHEET: '📋',
  IMAGE_ARTIFACT: '🖼️',
  PROJECT_FILE: '📁',
  PORTFOLIO_EVIDENCE: '🗂️',
};

// ---------- Page Component ----------

export default async function SubmissionReviewPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const teacherId = await getTeacherId();
  const ctx = await resolveContext(sp, teacherId);
  const q = buildContextQuery(ctx);

  const [submission, outcomes] = await Promise.all([
    getSubmissionById(id, teacherId, ctx),
    getOutcomesForContext(ctx),
  ]);

  if (!submission) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>❌</div>
        <div className={styles.emptyTitle}>Submission not found</div>
        <div className={styles.emptyDesc}>
          <Link href={`/teacher/submissions${q}`} style={{ color: 'var(--hp-primary)' }}>← Back to submissions</Link>
        </div>
      </div>
    );
  }

  const initials = getInitials(submission.studentName);
  const typeLabel = TYPE_LABELS[submission.submissionType] || 'Submission';
  const typeIcon = TYPE_ICONS[submission.submissionType] || '📝';
  const isWritten = !!submission.writtenResponse;
  const isArtifact = !!submission.fileUrl;
  const hasAiFeedback = submission.aiStatus === 'COMPLETE';

  // Performance level config for badges
  const LEVEL_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
    EMERGING:    { label: 'Emerging',    emoji: '🌱', color: '#b45309', bg: '#fef3c7' },
    APPROACHING: { label: 'Approaching', emoji: '📈', color: '#0369a1', bg: '#e0f2fe' },
    MEETING:     { label: 'Meeting',     emoji: '✅', color: '#15803d', bg: '#dcfce7' },
    EXCEEDING:   { label: 'Exceeding',   emoji: '🌟', color: '#7c3aed', bg: '#ede9fe' },
  };
  const aiLevel = submission.aiPerformanceLevel ? LEVEL_CONFIG[submission.aiPerformanceLevel] || LEVEL_CONFIG.APPROACHING : null;

  return (
    <>
      <Link href={`/teacher/submissions${q}`} className={styles.backLink} style={{ display: 'inline-block', marginBottom: 20, fontSize: '0.88rem' }}>
        ← Back to submissions
      </Link>

      {/* ===== SUBMISSION HEADER ===== */}
      <div className={styles.reviewHeader}>
        <div className={styles.reviewHeaderLeft}>
          <div className={styles.attentionAvatar} style={{ width: 52, height: 52, fontSize: '1.1rem' }}>
            {initials}
          </div>
          <div>
            <h2 className={styles.reviewTitle}>{submission.activityTitle}</h2>
            <div className={styles.reviewMeta}>
              <Link href={`/teacher/students/${submission.studentId}${q}`} style={{ color: 'var(--hp-primary)', textDecoration: 'none', fontWeight: 600 }}>
                {submission.studentName}
              </Link>
              <span>·</span>
              <span>Grade {submission.studentGradeLevel || '—'} · {ctx.subjectName}</span>
            </div>
            <div className={styles.reviewMeta} style={{ marginTop: 4 }}>
              <span>{submission.unitTitle}</span>
              <span>·</span>
              <span>{submission.lessonTitle}</span>
            </div>
          </div>
        </div>
        <div className={styles.reviewHeaderRight}>
          <span className={styles.evidenceTypeBadge} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
            {typeIcon} {typeLabel}
          </span>
          <span className={`${styles.reviewBadge} ${submission.reviewed ? styles.reviewDone : styles.reviewPending}`}>
            {submission.reviewed ? '✓ Reviewed' : 'Needs Review'}
          </span>
        </div>
      </div>

      {/* ===== TWO-COLUMN LAYOUT ===== */}
      <div className={styles.reviewLayout}>
        {/* LEFT: Submission Content */}
        <div className={styles.reviewContent}>
          {/* Written Response */}
          {isWritten && (
            <div className={styles.dashCard}>
              <h3 className={styles.cardTitle}>📝 Student Response</h3>
              <div className={styles.responseDisplay}>
                {submission.writtenResponse!.split('\n').map((paragraph, i) => (
                  <p key={i} className={styles.responseParagraph}>
                    {paragraph || '\u00A0'}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Artifact Display */}
          {isArtifact && (
            <div className={styles.dashCard}>
              <h3 className={styles.cardTitle}>📎 Submitted Artifact</h3>
              <div className={styles.artifactPreview}>
                <div className={styles.artifactPreviewIcon}>
                  {submission.submissionType === 'IMAGE_ARTIFACT' ? '🖼️'
                    : submission.submissionType === 'UPLOADED_WORKSHEET' ? '📄' : '📁'}
                </div>
                <div className={styles.artifactPreviewInfo}>
                  <div className={styles.artifactPreviewName}>{submission.fileName || 'Uploaded file'}</div>
                  <div className={styles.artifactPreviewType}>{typeLabel}</div>
                </div>
                {submission.fileUrl && submission.fileUrl !== '#' && (
                  <a
                    href={submission.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.smallBtn}
                    style={{ padding: '8px 16px', fontSize: '0.85rem', textDecoration: 'none' }}
                  >
                    📥 Download
                  </a>
                )}
                {submission.fileUrl === '#' && (
                  <span className={styles.smallBtn} style={{ padding: '8px 16px', fontSize: '0.85rem', opacity: 0.6, cursor: 'default' }}>
                    📥 Preview
                  </span>
                )}
              </div>
            </div>
          )}

          {/* No Written / No Artifact — Quiz or auto-scored */}
          {!isWritten && !isArtifact && (
            <div className={styles.dashCard}>
              <h3 className={styles.cardTitle}>📊 Submission Details</h3>
              <div className={styles.emptyState} style={{ padding: '32px 20px' }}>
                <div className={styles.emptyIcon}>{typeIcon}</div>
                <div className={styles.emptyTitle}>{typeLabel}</div>
                <div className={styles.emptyDesc}>
                  This submission was auto-scored. No written response or artifact to display.
                </div>
              </div>
            </div>
          )}

          {/* AI Initial Review — only show if COMPLETE */}
          {hasAiFeedback && (
            <div className={styles.dashCard} style={{ marginTop: 20, borderLeft: '3px solid #8b5cf6' }}>
              <h3 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                🤖 AI Initial Review
                {aiLevel && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 10px', borderRadius: 16, fontSize: '0.78rem', fontWeight: 600,
                    color: aiLevel.color, background: aiLevel.bg, marginLeft: 'auto',
                  }}>
                    {aiLevel.emoji} {aiLevel.label}
                  </span>
                )}
              </h3>

              {/* AI overall feedback */}
              {submission.aiFeedback && (
                <p style={{ margin: '0 0 14px', fontSize: '0.88rem', color: '#374151', lineHeight: 1.6 }}>
                  {submission.aiFeedback}
                </p>
              )}

              {/* AI Strengths */}
              {submission.aiStrengths && (
                <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '12px 14px', marginBottom: 10, borderLeft: '3px solid #22c55e' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#15803d', marginBottom: 4 }}>✨ Strengths</div>
                  <div style={{ fontSize: '0.85rem', color: '#166534', lineHeight: 1.5 }}>{submission.aiStrengths}</div>
                </div>
              )}

              {/* AI Areas for Improvement */}
              {submission.aiAreasForImprovement && (
                <div style={{ background: '#fffbeb', borderRadius: 8, padding: '12px 14px', marginBottom: 10, borderLeft: '3px solid #f59e0b' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#b45309', marginBottom: 4 }}>📝 Areas for Improvement</div>
                  <div style={{ fontSize: '0.85rem', color: '#92400e', lineHeight: 1.5 }}>{submission.aiAreasForImprovement}</div>
                </div>
              )}

              {/* AI Next Steps */}
              {submission.aiNextSteps && (
                <div style={{ background: '#eff6ff', borderRadius: 8, padding: '12px 14px', marginBottom: 10, borderLeft: '3px solid #3b82f6' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#1d4ed8', marginBottom: 4 }}>🎯 Next Steps</div>
                  <div style={{ fontSize: '0.85rem', color: '#1e40af', lineHeight: 1.5 }}>{submission.aiNextSteps}</div>
                </div>
              )}

              {/* AI provisional score + metadata */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, padding: '8px 0', borderTop: '1px solid #e5e7eb' }}>
                {submission.aiProvisionalScore !== null && submission.maxScore !== null && (
                  <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                    Provisional score: <strong>{submission.aiProvisionalScore}</strong> / {submission.maxScore}
                  </span>
                )}
                {submission.aiGeneratedAt && (
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    Generated {formatDate(submission.aiGeneratedAt)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Score Display */}
          {submission.score !== null && submission.maxScore !== null && (
            <div className={styles.dashCard} style={{ marginTop: 20 }}>
              <h3 className={styles.cardTitle}>🏆 Score</h3>
              <div className={styles.scoreDisplay}>
                <span className={styles.scoreValue}>{submission.score}</span>
                <span className={styles.scoreDivider}>/</span>
                <span className={styles.scoreMax}>{submission.maxScore}</span>
                <span className={styles.scorePct}>
                  ({Math.round((submission.score / submission.maxScore) * 100)}%)
                </span>
              </div>
            </div>
          )}

          {/* Submission Info */}
          <div className={styles.dashCard} style={{ marginTop: 20 }}>
            <h3 className={styles.cardTitle}>📅 Submission Info</h3>
            <div className={styles.reviewInfoGrid}>
              <div className={styles.reviewInfoItem}>
                <div className={styles.reviewInfoLabel}>Submitted</div>
                <div className={styles.reviewInfoValue}>{formatDate(submission.submittedAt)}</div>
              </div>
              <div className={styles.reviewInfoItem}>
                <div className={styles.reviewInfoLabel}>Type</div>
                <div className={styles.reviewInfoValue}>{typeLabel}</div>
              </div>
              {submission.reviewed && submission.reviewedAt && (
                <div className={styles.reviewInfoItem}>
                  <div className={styles.reviewInfoLabel}>Reviewed</div>
                  <div className={styles.reviewInfoValue}>{formatDate(submission.reviewedAt)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Existing Feedback Display */}
          {submission.teacherFeedback && (
            <div className={styles.dashCard} style={{ marginTop: 20 }}>
              <h3 className={styles.cardTitle}>💬 Previous Feedback</h3>
              <div className={styles.teacherFeedback}>
                {submission.teacherFeedback}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Review Actions Panel */}
        <div className={styles.reviewPanel}>
          <ReviewActions
            submissionId={submission.id}
            studentId={submission.studentId}
            studentName={submission.studentName}
            isReviewed={submission.reviewed}
            existingFeedback={submission.teacherFeedback}
            existingScore={submission.score}
            maxScore={submission.maxScore}
            outcomes={outcomes.map(o => ({
              id: o.id,
              code: o.code,
              description: o.description,
              unitContext: o.unitContext,
            }))}
            contextQuery={q}
            aiFeedback={submission.aiFeedback}
            aiProvisionalScore={submission.aiProvisionalScore}
            aiPerformanceLevel={submission.aiPerformanceLevel}
            aiStatus={submission.aiStatus}
          />
        </div>
      </div>
    </>
  );
}

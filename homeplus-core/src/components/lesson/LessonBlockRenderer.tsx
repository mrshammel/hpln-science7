'use client';

// ============================================
// Lesson Block Renderer — Home Plus LMS
// ============================================
// Renders individual lesson blocks by type.
// Used inside the universal lesson frame.

import { useState, useRef, useMemo } from 'react';
import styles from './lesson.module.css';
import type {
  BlockType,
  TextBlockContent,
  VideoBlockContent,
  ImageBlockContent,
  VocabularyBlockContent,
  WorkedExampleBlockContent,
  FillInBlankBlockContent,
  MatchingBlockContent,
  MultipleChoiceBlockContent,
  ConstructedResponseBlockContent,
  DrawingBlockContent,
  UploadBlockContent,
  MicroCheckBlockContent,
} from '@/lib/lesson-types';

interface BlockProps {
  blockType: BlockType;
  content: any; // JSON from DB, typed per block-type
  onAnswer?: (value: any) => void;
  readOnly?: boolean;
  showFeedback?: boolean;
}

export default function LessonBlockRenderer({ blockType, content, onAnswer, readOnly, showFeedback }: BlockProps) {
  switch (blockType) {
    case 'TEXT':
      return <TextBlock content={content as TextBlockContent} />;
    case 'VIDEO':
      return <VideoBlock content={content as VideoBlockContent} />;
    case 'IMAGE':
      return <ImageBlock content={content as ImageBlockContent} />;
    case 'AI_SUMMARY':
      return <AISummaryBlock content={content} />;
    case 'VOCABULARY':
      return <VocabularyBlock content={content as VocabularyBlockContent} />;
    case 'WORKED_EXAMPLE':
      return <WorkedExampleBlock content={content as WorkedExampleBlockContent} />;
    case 'FILL_IN_BLANK':
      return <FillInBlankBlock content={content as FillInBlankBlockContent} onAnswer={onAnswer} readOnly={readOnly} />;
    case 'MATCHING':
      return <MatchingBlock content={content as MatchingBlockContent} onAnswer={onAnswer} readOnly={readOnly} />;
    case 'MULTIPLE_CHOICE':
      return <MultipleChoiceBlock content={content as MultipleChoiceBlockContent} onAnswer={onAnswer} readOnly={readOnly} showFeedback={showFeedback} />;
    case 'CONSTRUCTED_RESPONSE':
      return <ConstructedResponseBlock content={content as ConstructedResponseBlockContent} onAnswer={onAnswer} readOnly={readOnly} />;
    case 'DRAWING':
      return <DrawingBlock content={content as DrawingBlockContent} onAnswer={onAnswer} />;
    case 'PHOTO_UPLOAD':
    case 'TAKE_PHOTO':
      return <UploadBlock content={content as UploadBlockContent} type="photo" onAnswer={onAnswer} />;
    case 'VIDEO_UPLOAD':
    case 'TAKE_VIDEO':
      return <UploadBlock content={content as UploadBlockContent} type="video" onAnswer={onAnswer} />;
    case 'FILE_UPLOAD':
      return <UploadBlock content={content as UploadBlockContent} type="file" onAnswer={onAnswer} />;
    case 'MICRO_CHECK':
      return <MicroCheckBlock content={content as MicroCheckBlockContent} onAnswer={onAnswer} />;
    default:
      return <div className={styles.blockCard}><p>Unsupported block type: {blockType}</p></div>;
  }
}

// ---- Text Block ----
function TextBlock({ content }: { content: TextBlockContent }) {
  if (!content?.html) return null;
  return (
    <div className={`${styles.blockCard} ${styles.textBlock}`}>
      <div dangerouslySetInnerHTML={{ __html: content.html }} />
    </div>
  );
}

// ---- Video Block ----
function VideoBlock({ content }: { content: VideoBlockContent }) {
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    return url;
  };

  if (!content?.url) {
    return (
      <div className={styles.blockCard}>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>🎥 Video URL not set yet</p>
      </div>
    );
  }

  return (
    <div className={styles.blockCard}>
      {content.title && <p style={{ fontWeight: 600, color: '#1e293b', margin: '0 0 10px' }}>{content.title}</p>}
      <div className={styles.videoBlock}>
        <iframe src={getEmbedUrl(content.url)} title={content.title || 'Video'} allowFullScreen />
      </div>
      {content.aiSummary && (
        <details style={{ marginTop: 10, fontSize: '0.85rem', color: '#475569' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#2563eb' }}>🤖 AI Summary</summary>
          <p style={{ marginTop: 6, lineHeight: 1.6 }}>{content.aiSummary}</p>
        </details>
      )}
    </div>
  );
}

// ---- Image Block ----
function ImageBlock({ content }: { content: ImageBlockContent }) {
  if (!content?.url) {
    return (
      <div className={styles.blockCard}>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>🖼️ Image URL not set yet</p>
      </div>
    );
  }
  return (
    <div className={`${styles.blockCard} ${styles.imageBlock}`}>
      <img src={content.url} alt={content.alt || ''} loading="lazy" />
      {content.caption && <p className={styles.imageCaption}>{content.caption}</p>}
    </div>
  );
}

// ---- AI Summary Block ----
function AISummaryBlock({ content }: { content: { summary: string; source?: string } }) {
  return (
    <div className={styles.blockCard} style={{ borderLeft: '4px solid #8b5cf6' }}>
      <p style={{ fontWeight: 600, color: '#6b21a8', fontSize: '0.82rem', margin: '0 0 6px' }}>🤖 AI Summary</p>
      <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6, margin: 0 }}>{content.summary}</p>
    </div>
  );
}

// ---- Vocabulary Block ----
function VocabularyBlock({ content }: { content: VocabularyBlockContent }) {
  return (
    <div className={styles.blockCard}>
      <p style={{ fontWeight: 700, color: '#166534', fontSize: '0.82rem', margin: '0 0 10px' }}>📗 Key Vocabulary</p>
      {(content.terms || []).map((t, i) => (
        <div key={i} className={styles.vocabCard}>
          <p className={styles.vocabTerm}>{t.term}</p>
          <p className={styles.vocabDef}>{t.definition}</p>
          {t.example && <p className={styles.vocabExample}>Example: {t.example}</p>}
        </div>
      ))}
    </div>
  );
}

// ---- Worked Example Block ----
function WorkedExampleBlock({ content }: { content: WorkedExampleBlockContent }) {
  return (
    <div className={`${styles.blockCard} ${styles.workedExample}`}>
      <p className={styles.workedExampleTitle}>📐 {content.title}</p>
      {(content.steps || []).map((s, i) => (
        <div key={i} className={styles.workedStep}>
          <strong>Step {i + 1}:</strong> {s.instruction}
          {s.detail && <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>{s.detail}</p>}
        </div>
      ))}
    </div>
  );
}

// ---- Fill in the Blank Block ----
function FillInBlankBlock({ content, onAnswer, readOnly }: {
  content: FillInBlankBlockContent;
  onAnswer?: (value: any) => void;
  readOnly?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleChange = (id: string, val: string) => {
    const next = { ...answers, [id]: val };
    setAnswers(next);
    onAnswer?.(next);
  };

  return (
    <div className={styles.interactiveBlock}>
      <p className={styles.interactivePrompt}>{content.prompt}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {(content.blanks || []).map((b) => (
          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {b.hint && <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{b.hint}:</span>}
            <input
              className={styles.fillBlank}
              value={answers[b.id] || ''}
              onChange={(e) => handleChange(b.id, e.target.value)}
              disabled={readOnly}
              placeholder="..."
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Matching Block ----
function MatchingBlock({ content, onAnswer, readOnly }: {
  content: MatchingBlockContent;
  onAnswer?: (value: any) => void;
  readOnly?: boolean;
}) {
  const [matches, setMatches] = useState<Record<string, string>>({});
  // Memoize the shuffled right-side options so they don't reshuffle on every render
  const rights = useMemo(
    () => (content.pairs || []).map((p) => p.right).sort(() => Math.random() - 0.5),
    [content.pairs],
  );

  const handleSelect = (left: string, right: string) => {
    if (readOnly) return;
    const next = { ...matches, [left]: right };
    setMatches(next);
    onAnswer?.(next);
  };

  return (
    <div className={styles.interactiveBlock}>
      <p className={styles.interactivePrompt}>{content.instruction || 'Match the items:'}</p>
      {(content.pairs || []).map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ flex: '1 1 150px', fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>{p.left}</span>
          <span style={{ color: '#94a3b8' }}>→</span>
          <select
            value={matches[p.left] || ''}
            onChange={(e) => handleSelect(p.left, e.target.value)}
            disabled={readOnly}
            style={{ flex: '1 1 150px', padding: '6px 10px', fontSize: '0.85rem', borderRadius: 8, border: '1.5px solid #e2e8f0' }}
          >
            <option value="">Select...</option>
            {rights.map((r, j) => <option key={j} value={r}>{r}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}

// ---- Multiple Choice Block ----
function MultipleChoiceBlock({ content, onAnswer, readOnly, showFeedback }: {
  content: MultipleChoiceBlockContent;
  onAnswer?: (value: any) => void;
  readOnly?: boolean;
  showFeedback?: boolean;
}) {
  const [selected, setSelected] = useState<string>('');

  const handleSelect = (val: string) => {
    if (readOnly) return;
    setSelected(val);
    onAnswer?.(val);
  };

  return (
    <div className={styles.interactiveBlock}>
      <p className={styles.interactivePrompt}>{content.question}</p>
      {(content.options || []).map((opt, i) => {
        let cls = styles.mcOption;
        if (selected === opt.value) cls += ' ' + styles.mcOptionSelected;
        if (showFeedback && selected === opt.value) {
          cls += ' ' + (opt.correct ? styles.mcOptionCorrect : styles.mcOptionIncorrect);
        }

        return (
          <div key={i} className={cls} onClick={() => handleSelect(opt.value)}>
            <div className={styles.mcRadio} style={selected === opt.value ? { background: '#2563eb', borderColor: '#2563eb' } : {}} />
            <span>{opt.label}</span>
          </div>
        );
      })}
      {showFeedback && content.explanation && selected && (
        <p style={{ fontSize: '0.82rem', color: '#475569', marginTop: 10, padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
          💡 {content.explanation}
        </p>
      )}
    </div>
  );
}

// ---- Constructed Response Block ----
function ConstructedResponseBlock({ content, onAnswer, readOnly }: {
  content: ConstructedResponseBlockContent;
  onAnswer?: (value: any) => void;
  readOnly?: boolean;
}) {
  const [text, setText] = useState('');

  return (
    <div className={styles.interactiveBlock}>
      <p className={styles.interactivePrompt}>{content.prompt}</p>
      {content.rubricHint && (
        <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 8px' }}>
          📋 {content.rubricHint}
        </p>
      )}
      <textarea
        className={styles.textArea}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onAnswer?.(e.target.value);
        }}
        disabled={readOnly}
        placeholder="Write your response..."
        style={{ minHeight: content.minLength && content.minLength > 100 ? 180 : 100 }}
      />
      {content.teacherReviewRequired && (
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '6px 0 0' }}>
          👩‍🏫 This response will be reviewed by your teacher
        </p>
      )}
    </div>
  );
}

// ---- Drawing Block ----
function DrawingBlock({ content, onAnswer }: { content: DrawingBlockContent; onAnswer?: (value: any) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    // Create preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    onAnswer?.({ fileName: file.name, fileSize: file.size, fileType: file.type, uploaded: true });
  };

  return (
    <div className={styles.interactiveBlock}>
      <p className={styles.interactivePrompt}>🎨 {content.instruction}</p>
      {content.backgroundImage && (
        <div style={{ marginBottom: 10, textAlign: 'center' }}>
          <img src={content.backgroundImage} alt="Template" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #e2e8f0' }} />
        </div>
      )}

      {/* Photo preview */}
      {preview ? (
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <img
            src={preview}
            alt="Your uploaded work"
            style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 12, border: '2px solid #22c55e', objectFit: 'contain' }}
          />
          <p style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 600, margin: '8px 0 0' }}>✓ {fileName}</p>
        </div>
      ) : null}

      {/* Upload zone */}
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          border: preview ? '2px solid #22c55e' : '2px dashed #cbd5e1',
          borderRadius: 12,
          padding: preview ? '14px 20px' : '40px 20px',
          textAlign: 'center',
          background: preview ? '#f0fdf4' : '#fafbfc',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {preview ? (
          <p style={{ color: '#059669', fontSize: '0.85rem', margin: 0, fontWeight: 600 }}>
            📷 Click to replace photo
          </p>
        ) : (
          <>
            <p style={{ fontSize: '1.5rem', margin: '0 0 8px' }}>📷</p>
            <p style={{ color: '#334155', fontSize: '0.88rem', fontWeight: 600, margin: '0 0 4px' }}>
              Take a photo or upload your work
            </p>
            <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
              Draw on paper or a tablet, then tap here to upload a photo
            </p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleUpload}
        style={{ display: 'none' }}
      />
    </div>
  );
}

// ---- Upload Block (photo/video/file) ----
function UploadBlock({ content, type, onAnswer }: {
  content: UploadBlockContent;
  type: 'photo' | 'video' | 'file';
  onAnswer?: (value: any) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const icons = { photo: '📷', video: '🎬', file: '📎' };
  const accept = type === 'photo' ? 'image/*' : type === 'video' ? 'video/*' : (content.acceptedTypes || ['*']).join(',');
  const captureAttr = type === 'photo' || type === 'video' ? 'environment' : undefined;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onAnswer?.({ fileName: file.name, fileSize: file.size, fileType: file.type });
    }
  };

  return (
    <div className={styles.interactiveBlock}>
      <p className={styles.interactivePrompt}>{content.instruction}</p>
      <div className={styles.uploadZone} onClick={() => inputRef.current?.click()}>
        <div className={styles.uploadIcon}>{icons[type]}</div>
        {fileName ? (
          <p className={styles.uploadText} style={{ color: '#059669', fontWeight: 600 }}>✓ {fileName}</p>
        ) : (
          <>
            <p className={styles.uploadText}>
              {type === 'file' ? 'Click to upload a file or scanned document' : `Click to ${type === 'photo' ? 'take or upload a photo' : 'record or upload a video'}`}
            </p>
            <p className={styles.uploadHint}>
              {type === 'file'
                ? 'Supports PDF, images, and common document formats'
                : type === 'photo'
                ? 'JPG, PNG, or other image formats'
                : 'MP4, MOV, or other video formats'}
              {content.maxSizeMb ? ` (max ${content.maxSizeMb}MB)` : ''}
            </p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        capture={captureAttr as any}
        onChange={handleChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}

// ---- Micro Check Block ----
function MicroCheckBlock({ content, onAnswer }: {
  content: MicroCheckBlockContent;
  onAnswer?: (value: any) => void;
}) {
  const [selected, setSelected] = useState<string>('');
  const [checked, setChecked] = useState(false);

  const handleCheck = () => {
    setChecked(true);
    const correct = content.options.find((o) => o.correct)?.value === selected;
    onAnswer?.({ selected, correct });
  };

  return (
    <div className={styles.interactiveBlock} style={{ borderLeft: '4px solid #8b5cf6' }}>
      <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#7c3aed', margin: '0 0 6px' }}>❓ Quick Check</p>
      <p className={styles.interactivePrompt}>{content.question}</p>
      {content.options.map((opt, i) => {
        let cls = styles.mcOption;
        if (selected === opt.value) cls += ' ' + styles.mcOptionSelected;
        if (checked && selected === opt.value) {
          cls += ' ' + (opt.correct ? styles.mcOptionCorrect : styles.mcOptionIncorrect);
        }

        return (
          <div key={i} className={cls} onClick={() => !checked && setSelected(opt.value)}>
            <div className={styles.mcRadio} style={selected === opt.value ? { background: '#7c3aed', borderColor: '#7c3aed' } : {}} />
            <span>{opt.label}</span>
          </div>
        );
      })}
      {!checked && selected && (
        <button onClick={handleCheck} className={styles.btnPrimary} style={{ marginTop: 10, background: '#7c3aed' }}>
          Check Answer
        </button>
      )}
      {checked && content.explanation && (
        <p style={{ fontSize: '0.82rem', color: '#475569', marginTop: 10, padding: '8px 12px', background: '#faf5ff', borderRadius: 8 }}>
          💡 {content.explanation}
        </p>
      )}
    </div>
  );
}

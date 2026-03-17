// ============================================
// Lesson Types — Home Plus LMS
// ============================================
// Shared TypeScript types for the universal lesson frame,
// subject-specific mastery engines, and lesson block rendering.

// ---------- Subject Modes ----------

export type SubjectMode = 'GENERAL' | 'SCIENCE' | 'ELA' | 'MATH' | 'SOCIAL_STUDIES';

// ---------- Lesson Sections ----------

export type LessonSectionType = 'WARM_UP' | 'LEARN' | 'PRACTICE' | 'CHECK' | 'REFLECT';

export const SECTION_ORDER: LessonSectionType[] = [
  'WARM_UP',
  'LEARN',
  'PRACTICE',
  'CHECK',
  'REFLECT',
];

export const SECTION_LABELS: Record<LessonSectionType, string> = {
  WARM_UP: 'Warm-Up',
  LEARN: 'Learn',
  PRACTICE: 'Guided Practice',
  CHECK: 'Mastery Check',
  REFLECT: 'Reflection',
};

export const SECTION_ICONS: Record<LessonSectionType, string> = {
  WARM_UP: '🔥',
  LEARN: '📖',
  PRACTICE: '✏️',
  CHECK: '✅',
  REFLECT: '💭',
};

// ---------- Block Types ----------

export type BlockType =
  | 'TEXT'
  | 'VIDEO'
  | 'IMAGE'
  | 'AI_SUMMARY'
  | 'VOCABULARY'
  | 'WORKED_EXAMPLE'
  | 'FILL_IN_BLANK'
  | 'MATCHING'
  | 'MULTIPLE_CHOICE'
  | 'CONSTRUCTED_RESPONSE'
  | 'DRAWING'
  | 'PHOTO_UPLOAD'
  | 'TAKE_PHOTO'
  | 'VIDEO_UPLOAD'
  | 'TAKE_VIDEO'
  | 'FILE_UPLOAD'
  | 'MICRO_CHECK';

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  TEXT: 'Text',
  VIDEO: 'Video',
  IMAGE: 'Image / Diagram',
  AI_SUMMARY: 'AI Summary',
  VOCABULARY: 'Vocabulary',
  WORKED_EXAMPLE: 'Worked Example',
  FILL_IN_BLANK: 'Fill in the Blank',
  MATCHING: 'Matching',
  MULTIPLE_CHOICE: 'Multiple Choice',
  CONSTRUCTED_RESPONSE: 'Constructed Response',
  DRAWING: 'Drawing / Sketch',
  PHOTO_UPLOAD: 'Photo Upload',
  TAKE_PHOTO: 'Take Photo',
  VIDEO_UPLOAD: 'Video Upload',
  TAKE_VIDEO: 'Take Video',
  FILE_UPLOAD: 'File Upload',
  MICRO_CHECK: 'Micro Check',
};

export const BLOCK_TYPE_ICONS: Record<BlockType, string> = {
  TEXT: '📝',
  VIDEO: '🎥',
  IMAGE: '🖼️',
  AI_SUMMARY: '🤖',
  VOCABULARY: '📗',
  WORKED_EXAMPLE: '📐',
  FILL_IN_BLANK: '✍️',
  MATCHING: '🔗',
  MULTIPLE_CHOICE: '🔘',
  CONSTRUCTED_RESPONSE: '📄',
  DRAWING: '🎨',
  PHOTO_UPLOAD: '📷',
  TAKE_PHOTO: '📸',
  VIDEO_UPLOAD: '🎬',
  TAKE_VIDEO: '📹',
  FILE_UPLOAD: '📎',
  MICRO_CHECK: '❓',
};

// ---------- Block Content Interfaces ----------

export interface TextBlockContent {
  html: string; // rich text HTML
}

export interface VideoBlockContent {
  url: string;
  title?: string;
  transcript?: string;
  aiSummary?: string;
}

export interface ImageBlockContent {
  url: string;
  alt: string;
  caption?: string;
}

export interface VocabularyBlockContent {
  terms: Array<{
    term: string;
    definition: string;
    example?: string;
  }>;
}

export interface WorkedExampleBlockContent {
  title: string;
  steps: Array<{
    instruction: string;
    detail?: string;
  }>;
}

export interface FillInBlankBlockContent {
  prompt: string;
  blanks: Array<{
    id: string;
    correctAnswer: string;
    hint?: string;
  }>;
}

export interface MatchingBlockContent {
  instruction: string;
  pairs: Array<{
    left: string;
    right: string;
  }>;
}

export interface MultipleChoiceBlockContent {
  question: string;
  options: Array<{
    label: string;
    value: string;
    correct?: boolean;
  }>;
  explanation?: string;
}

export interface ConstructedResponseBlockContent {
  prompt: string;
  minLength?: number;
  rubricHint?: string;
  teacherReviewRequired?: boolean;
}

export interface DrawingBlockContent {
  instruction: string;
  backgroundImage?: string; // optional template/diagram
}

export interface UploadBlockContent {
  instruction: string;
  acceptedTypes?: string[]; // e.g. ['image/*', '.pdf']
  maxSizeMb?: number;
}

export interface MicroCheckBlockContent {
  question: string;
  options: Array<{ label: string; value: string; correct?: boolean }>;
  explanation?: string;
}

// ---------- Mastery Configuration ----------

export interface MasteryConfig {
  passPercent: number;     // e.g. 80 for science, 70 for math
  maxRetries: number;      // max quiz attempts before soft-lock
  reteachEnabled: boolean; // science = true
  immediateCorrectiveFeedback: boolean; // math = true
}

export const DEFAULT_MASTERY_CONFIG: Record<SubjectMode, MasteryConfig> = {
  GENERAL: {
    passPercent: 70,
    maxRetries: 3,
    reteachEnabled: false,
    immediateCorrectiveFeedback: false,
  },
  SCIENCE: {
    passPercent: 80,
    maxRetries: 5,
    reteachEnabled: true,
    immediateCorrectiveFeedback: false,
  },
  ELA: {
    passPercent: 0, // not quiz-gated — uses completion/review
    maxRetries: 0,
    reteachEnabled: false,
    immediateCorrectiveFeedback: false,
  },
  MATH: {
    passPercent: 70,
    maxRetries: 5,
    reteachEnabled: false,
    immediateCorrectiveFeedback: true,
  },
  SOCIAL_STUDIES: {
    passPercent: 0, // not quiz-gated — uses response/reflection
    maxRetries: 0,
    reteachEnabled: false,
    immediateCorrectiveFeedback: false,
  },
};

// ---------- Warm-Up Configuration ----------

export interface WarmUpConfig {
  type: 'retrieval' | 'matching' | 'fill_blank' | 'prediction' | 'recall';
  prompt: string;
  options?: Array<{ label: string; value: string; correct?: boolean }>;
}

// ---------- Progress States ----------

export type ProgressStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETE'
  | 'MASTERED'
  | 'NEEDS_RETEACH';

export interface SectionsData {
  warmUp?: boolean;
  learn?: boolean;
  practice?: boolean;
  check?: boolean;
  reflect?: boolean;
}

// ---------- Lesson Launch Data ----------

export interface LessonLaunchData {
  lessonTitle: string;
  unitTitle: string;
  courseName: string;
  courseIcon: string;
  estimatedMinutes: number | null;
  learningGoal: string | null;
  successCriteria: string | null;
  materials: string | null;
  lessonPosition: string; // e.g. "Lesson 2 of 6"
  subjectMode: SubjectMode;
  progressStatus: ProgressStatus;
}

// ---------- Mastery Engine Interface ----------

export interface MasteryResult {
  passed: boolean;
  score: number;       // 0-100
  totalQuestions: number;
  correctCount: number;
  missedOutcomes: string[]; // outcome codes that were missed
  needsReteach: boolean;
  reteachOutcome?: string;  // specific outcome to reteach
  feedback: string;
  canRetry: boolean;
}

export interface MasteryEngine {
  subjectMode: SubjectMode;
  evaluate(
    answers: Array<{ questionId: string; response: string }>,
    questions: Array<{
      id: string;
      correctAnswer: string | null;
      outcomeCode: string | null;
      options: any;
      questionType: string;
    }>,
    previousAttempts: Array<{
      questionId: string;
      correct: boolean;
      attemptNumber: number;
    }>,
    config: MasteryConfig,
  ): MasteryResult;
}

// ---------- Subject Mode Detection ----------

/**
 * Determine the subject mode from the lesson's explicitly set mode,
 * or infer from the course/subject name.
 */
export function resolveSubjectMode(
  lessonMode: SubjectMode | null | undefined,
  subjectName: string,
): SubjectMode {
  if (lessonMode && lessonMode !== 'GENERAL') return lessonMode;

  const name = subjectName.toLowerCase();
  if (name.includes('science')) return 'SCIENCE';
  if (name.includes('english') || name.includes('ela') || name.includes('language arts'))
    return 'ELA';
  if (name.includes('math')) return 'MATH';
  if (name.includes('social') || name.includes('studies')) return 'SOCIAL_STUDIES';

  return 'GENERAL';
}

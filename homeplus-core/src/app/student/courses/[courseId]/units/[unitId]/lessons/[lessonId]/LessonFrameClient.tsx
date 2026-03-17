'use client';

// ============================================
// Lesson Frame Client Wrapper — Home Plus LMS
// ============================================
// Thin client wrapper that casts serialized data
// from server component into the typed props LessonFrame expects.

import LessonFrame from '@/components/lesson/LessonFrame';
import type { SubjectMode, MasteryConfig, SectionsData, LessonSectionType } from '@/lib/lesson-types';

interface LessonFrameClientProps {
  lessonId: string;
  lessonTitle: string;
  unitTitle: string;
  courseName: string;
  courseIcon: string;
  courseId: string;
  unitId: string;
  estimatedMinutes: number | null;
  learningGoal: string | null;
  successCriteria: string | null;
  materials: string | null;
  lessonPosition: string;
  subjectMode: SubjectMode;
  reflectionPrompt: string | null;
  masteryConfig: MasteryConfig | null;
  blocks: Array<{
    id: string;
    section: string;
    blockType: string;
    content: any;
    order: number;
  }>;
  questions: Array<{
    id: string;
    questionText: string;
    questionType: string;
    options: any;
    correctAnswer: string | null;
    outcomeCode: string | null;
    explanation: string | null;
  }>;
  initialProgress: {
    status: string;
    sectionsData: SectionsData | null;
  } | null;
  warmUpConfig: any;
}

export default function LessonFrameClient(props: LessonFrameClientProps) {
  // Cast string enums from serialized server data to typed enums
  const typedBlocks = props.blocks.map((b) => ({
    ...b,
    section: b.section as LessonSectionType,
    blockType: b.blockType,
  }));

  return (
    <LessonFrame
      {...props}
      blocks={typedBlocks}
    />
  );
}

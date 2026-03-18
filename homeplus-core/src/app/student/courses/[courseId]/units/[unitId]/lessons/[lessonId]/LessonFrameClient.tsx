'use client';

// ============================================
// Lesson Frame Client Wrapper — Home Plus LMS
// ============================================
// Adds subject-colored header chrome around the
// lesson content. Passes props to LessonFrame.

import Link from 'next/link';
import LessonFrame from '@/components/lesson/LessonFrame';
import { subjectColorVars, getSubjectColors } from '@/lib/subject-colors';
import type { SubjectMode, MasteryConfig, SectionsData, LessonSectionType } from '@/lib/lesson-types';
import styles from '../../../../student.module.css';

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
    <div style={subjectColorVars(props.courseName)}>
      {/* Subject-colored lesson header */}
      <div className={styles.lessonHeader}>
        <nav className={styles.breadcrumb} aria-label="Lesson breadcrumb">
          <Link href="/student/courses" className={styles.breadcrumbLink}>Courses</Link>
          <span className={styles.breadcrumbSep}>›</span>
          <Link href={`/student/courses/${props.courseId}`} className={styles.breadcrumbLink}>
            {props.courseIcon} {props.courseName}
          </Link>
          <span className={styles.breadcrumbSep}>›</span>
          <Link href={`/student/courses/${props.courseId}/units/${props.unitId}`} className={styles.breadcrumbLink}>
            {props.unitTitle}
          </Link>
          <span className={styles.breadcrumbSep}>›</span>
          <span className={styles.breadcrumbCurrent}>{props.lessonPosition}</span>
        </nav>
        <div className={styles.lessonHeaderTop}>
          <h2 className={styles.lessonHeaderTitle}>{props.lessonTitle}</h2>
          <span className={`${styles.statusChip} ${styles.statusInProgress}`}>
            {props.lessonPosition}
          </span>
        </div>
        <div className={styles.lessonHeaderMeta}>
          {props.courseIcon} {props.courseName} · {props.unitTitle}
          {props.estimatedMinutes && ` · ~${props.estimatedMinutes} min`}
        </div>
      </div>

      {/* Lesson frame content (untouched) */}
      <LessonFrame
        {...props}
        blocks={typedBlocks}
      />
    </div>
  );
}

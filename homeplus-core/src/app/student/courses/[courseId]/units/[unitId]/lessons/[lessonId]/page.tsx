// ============================================
// Student Lesson Page — Home Plus LMS
// ============================================
// Route: /student/courses/[courseId]/units/[unitId]/lessons/[lessonId]
// Server component that loads data and renders the universal LessonFrame.

import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { resolveSubjectMode, DEFAULT_MASTERY_CONFIG } from '@/lib/lesson-types';
import LessonFrameClient from './LessonFrameClient';

interface Props {
  params: Promise<{ courseId: string; unitId: string; lessonId: string }>;
}

export default async function LessonPage({ params }: Props) {
  const { courseId, unitId, lessonId } = await params;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    notFound();
  }

  // Load lesson with full data
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      unit: {
        include: {
          subject: { select: { id: true, name: true, icon: true, gradeLevel: true } },
          lessons: { select: { id: true, order: true }, orderBy: { order: 'asc' } },
        },
      },
      blocks: { orderBy: { order: 'asc' } },
      quizQuestions: { orderBy: { order: 'asc' } },
    },
  });

  if (!lesson || lesson.unit.subject.id !== courseId || lesson.unit.id !== unitId) {
    notFound();
  }

  // Load progress
  const progress = await prisma.studentProgress.findUnique({
    where: { studentId_lessonId: { studentId: userId, lessonId } },
  });

  // Determine lesson position
  const allLessons = lesson.unit.lessons;
  const lessonIndex = allLessons.findIndex((l) => l.id === lessonId);
  const lessonPosition = `Lesson ${lessonIndex + 1} of ${allLessons.length}`;

  // Determine subject mode
  const subjectMode = resolveSubjectMode(
    lesson.subjectMode as any,
    lesson.unit.subject.name,
  );

  // Determine mastery config
  const masteryConfig = (lesson.masteryConfig as any) || DEFAULT_MASTERY_CONFIG[subjectMode];

  return (
    <LessonFrameClient
      lessonId={lesson.id}
      lessonTitle={lesson.title}
      unitTitle={lesson.unit.title}
      courseName={lesson.unit.subject.name}
      courseIcon={lesson.unit.subject.icon}
      courseId={courseId}
      unitId={unitId}
      estimatedMinutes={lesson.estimatedMinutes}
      learningGoal={lesson.learningGoal}
      successCriteria={lesson.successCriteria}
      materials={lesson.materials}
      lessonPosition={lessonPosition}
      subjectMode={subjectMode}
      reflectionPrompt={lesson.reflectionPrompt}
      masteryConfig={masteryConfig}
      blocks={lesson.blocks.map((b) => ({
        id: b.id,
        section: b.section as any,
        blockType: b.blockType as any,
        content: b.content,
        order: b.order,
      }))}
      questions={lesson.quizQuestions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options,
        correctAnswer: q.correctAnswer,
        outcomeCode: q.outcomeCode,
        explanation: q.explanation,
      }))}
      initialProgress={
        progress
          ? {
              status: progress.status,
              sectionsData: progress.sectionsData as any,
            }
          : null
      }
      warmUpConfig={lesson.warmUpConfig}
    />
  );
}

// ============================================
// Lesson Submit API — Home Plus LMS
// ============================================
// POST: submit mastery check answers, score them,
//       record attempts, handle reteach triggers.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getMasteryEngine } from '@/lib/mastery-engine';
import { DEFAULT_MASTERY_CONFIG, resolveSubjectMode } from '@/lib/lesson-types';

interface RouteParams {
  params: Promise<{ lessonId: string }>;
}

// POST /api/lesson/[lessonId]/submit
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { lessonId } = await params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  // --- Reteach answer submission ---
  if (body.reteach) {
    const { outcomeCode, questionId, response, correct } = body;

    if (!outcomeCode || !questionId) {
      return NextResponse.json({ error: 'outcomeCode and questionId required for reteach' }, { status: 400 });
    }

    // Record reteach attempt
    await prisma.masteryAttempt.create({
      data: {
        studentId: userId,
        lessonId,
        questionId,
        response: String(response ?? ''),
        correct: !!correct,
        attemptNumber: 0, // 0 = reteach attempt
      },
    });

    // Update reteach session
    if (correct) {
      const reteachSess = await prisma.reteachSession.findFirst({
        where: { studentId: userId, lessonId, outcomeCode, status: 'ACTIVE' },
      });
      if (reteachSess) {
        const newStreak = reteachSess.correctStreak + 1;
        await prisma.reteachSession.update({
          where: { id: reteachSess.id },
          data: {
            correctStreak: newStreak,
            status: newStreak >= 3 ? 'COMPLETED' : 'ACTIVE',
          },
        });
      }
    } else {
      // Reset streak
      await prisma.reteachSession.updateMany({
        where: { studentId: userId, lessonId, outcomeCode, status: 'ACTIVE' },
        data: { correctStreak: 0 },
      });
    }

    return NextResponse.json({ ok: true });
  }

  // --- Single-question submission (one-at-a-time mastery) ---
  if (body.singleQuestion) {
    const { questionId, response, correct, outcomeCode } = body;

    if (!questionId) {
      return NextResponse.json({ error: 'questionId required' }, { status: 400 });
    }

    // Get current attempt number
    const prevAttempts = await prisma.masteryAttempt.findMany({
      where: { studentId: userId, lessonId, attemptNumber: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    const attemptNumber = prevAttempts.length > 0 ? prevAttempts[0].attemptNumber : 1;

    // Record the attempt
    await prisma.masteryAttempt.create({
      data: {
        studentId: userId,
        lessonId,
        questionId,
        response: String(response ?? ''),
        correct: !!correct,
        attemptNumber,
      },
    });

    return NextResponse.json({ ok: true, correct: !!correct });
  }

  // --- Regular mastery check submission ---
  const { answers } = body as {
    answers: Array<{ questionId: string; response: string }>;
  };

  if (!answers?.length) {
    return NextResponse.json({ error: 'No answers provided' }, { status: 400 });
  }

  // Load lesson with subject info
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      unit: { include: { subject: { select: { name: true } } } },
      quizQuestions: true,
    },
  });

  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

  const subjectMode = resolveSubjectMode(
    lesson.subjectMode as any,
    lesson.unit.subject.name,
  );

  const config =
    (lesson.masteryConfig as any) || DEFAULT_MASTERY_CONFIG[subjectMode];

  // Load previous attempts
  const previousAttempts = await prisma.masteryAttempt.findMany({
    where: { studentId: userId, lessonId, attemptNumber: { gt: 0 } },
    orderBy: { createdAt: 'asc' },
  });

  const attemptNumber =
    Math.max(...previousAttempts.map((a) => a.attemptNumber), 0) + 1;

  // Get the mastery engine and evaluate
  const engine = getMasteryEngine(subjectMode);
  const result = engine.evaluate(
    answers,
    lesson.quizQuestions.map((q) => ({
      id: q.id,
      correctAnswer: q.correctAnswer,
      outcomeCode: q.outcomeCode,
      options: q.options,
      questionType: q.questionType,
    })),
    previousAttempts.map((a) => ({
      questionId: a.questionId,
      correct: a.correct,
      attemptNumber: a.attemptNumber,
    })),
    config,
  );

  // Record each answer as a mastery attempt using the engine's scoring results
  for (const answer of answers) {
    const q = lesson.quizQuestions.find((qq) => qq.id === answer.questionId);
    if (!q) continue;

    // Use the engine's already-computed correctness from the result
    const engineResult = (result as any).results;
    let correct = false;
    if (engineResult) {
      const er = engineResult.find((r: any) => r.questionId === q.id);
      correct = er?.correct ?? false;
    } else {
      // Fallback: compute correctness if engine didn't return per-question results  
      if (q.questionType === 'MULTIPLE_CHOICE' && q.options) {
        const opts = q.options as Array<{ value: string; correct?: boolean }>;
        correct = !!opts.find((o) => o.value === answer.response)?.correct;
      } else {
        correct =
          q.correctAnswer !== null &&
          answer.response.trim().toLowerCase() ===
            q.correctAnswer.trim().toLowerCase();
      }
    }

    await prisma.masteryAttempt.create({
      data: {
        studentId: userId,
        lessonId,
        questionId: q.id,
        response: answer.response,
        correct,
        attemptNumber,
      },
    });
  }

  // If science reteach triggered, create a reteach session
  if (result.needsReteach && result.reteachOutcome) {
    const existing = await prisma.reteachSession.findFirst({
      where: {
        studentId: userId,
        lessonId,
        outcomeCode: result.reteachOutcome,
        status: 'ACTIVE',
      },
    });

    if (!existing) {
      await prisma.reteachSession.create({
        data: {
          studentId: userId,
          lessonId,
          outcomeCode: result.reteachOutcome,
          correctStreak: 0,
        },
      });
    }
  }

  // Update progress
  await prisma.studentProgress.upsert({
    where: { studentId_lessonId: { studentId: userId, lessonId } },
    create: {
      studentId: userId,
      lessonId,
      status: result.passed ? 'MASTERED' : result.needsReteach ? 'NEEDS_RETEACH' : 'IN_PROGRESS',
      masteryScore: result.score,
      completedAt: result.passed ? new Date() : undefined,
    },
    update: {
      status: result.passed ? 'MASTERED' : result.needsReteach ? 'NEEDS_RETEACH' : 'IN_PROGRESS',
      masteryScore: result.score,
      completedAt: result.passed ? new Date() : undefined,
    },
  });

  return NextResponse.json(result);
}

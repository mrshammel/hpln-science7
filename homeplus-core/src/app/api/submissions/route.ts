import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isEligibleForAiFeedback } from '@/lib/ai-feedback';

/**
 * POST /api/submissions
 * Submit an activity response. For written work (SHORT_ANSWER, PARAGRAPH_RESPONSE,
 * ESSAY, REFLECTION), triggers asynchronous AI feedback generation.
 *
 * Body: {
 *   activityId: string,
 *   score?: number,
 *   maxScore?: number,
 *   response?: any,
 *   writtenResponse?: string,
 *   submissionType?: string,
 *   fileName?: string,
 *   fileUrl?: string,
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      activityId,
      score,
      maxScore,
      response,
      writtenResponse,
      submissionType,
      fileName,
      fileUrl,
    } = body;

    if (!activityId) {
      return NextResponse.json(
        { error: 'Missing required field: activityId' },
        { status: 400 }
      );
    }

    // Validate activity exists
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        lesson: { select: { id: true } },
      },
    });
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Determine submission type
    const resolvedType = submissionType || 'QUIZ_RESPONSE';

    // Determine if this is eligible for AI feedback
    const hasWrittenWork = !!writtenResponse && writtenResponse.trim().length > 0;
    const eligibleForAi = hasWrittenWork && isEligibleForAiFeedback(resolvedType);

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        studentId: user.id,
        activityId,
        score: score !== undefined ? parseFloat(score) : null,
        maxScore: maxScore !== undefined ? parseFloat(maxScore) : null,
        response: response || null,
        writtenResponse: writtenResponse || null,
        submissionType: resolvedType as 'QUIZ_RESPONSE',
        fileName: fileName || null,
        fileUrl: fileUrl || null,
        // Set AI status to PENDING for eligible types
        aiStatus: eligibleForAi ? 'PENDING' : 'NONE',
      },
    });

    // Auto-update lesson progress to IN_PROGRESS if not already COMPLETE
    const existingProgress = await prisma.studentProgress.findUnique({
      where: {
        studentId_lessonId: {
          studentId: user.id,
          lessonId: activity.lesson.id,
        },
      },
    });

    if (!existingProgress) {
      await prisma.studentProgress.create({
        data: {
          studentId: user.id,
          lessonId: activity.lesson.id,
          status: 'IN_PROGRESS',
        },
      });
    } else if (existingProgress.status === 'NOT_STARTED') {
      await prisma.studentProgress.update({
        where: { id: existingProgress.id },
        data: { status: 'IN_PROGRESS' },
      });
    }

    // Trigger async AI feedback generation (fire-and-forget)
    if (eligibleForAi) {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
      fetch(`${baseUrl}/api/ai/generate-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id }),
      }).catch((err) => {
        console.error('[Submissions] AI trigger failed:', err);
        // Non-blocking — the status will stay PENDING and eventually be
        // marked FAILED by a future check or manual re-trigger.
      });
    }

    return NextResponse.json({
      submission: {
        id: submission.id,
        aiStatus: eligibleForAi ? 'PENDING' : 'NONE',
      },
      message: 'Submission recorded successfully',
      aiEligible: eligibleForAi,
    });
  } catch (error) {
    console.error('[API /submissions POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

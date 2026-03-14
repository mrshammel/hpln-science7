import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * POST /api/submissions
 * Submit an activity response and score.
 *
 * Body: {
 *   activityId: string,
 *   score: number,
 *   maxScore: number,
 *   response?: any   // optional JSON (answers, text, etc.)
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
    const { activityId, score, maxScore, response } = body;

    if (!activityId || score === undefined || maxScore === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: activityId, score, maxScore' },
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

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        studentId: user.id,
        activityId,
        score: parseFloat(score),
        maxScore: parseFloat(maxScore),
        response: response || null,
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

    return NextResponse.json({
      submission,
      message: 'Submission recorded successfully',
    });
  } catch (error) {
    console.error('[API /submissions POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

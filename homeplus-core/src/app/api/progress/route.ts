import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/progress
 * Returns the current student's lesson progress.
 * Optional query: ?lessonId=X or ?unitId=X
 */
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get('lessonId');
    const unitId = searchParams.get('unitId');

    // Build query filter
    const where: any = { studentId: user.id };
    if (lessonId) {
      where.lessonId = lessonId;
    } else if (unitId) {
      where.lesson = { unitId };
    }

    const progress = await prisma.studentProgress.findMany({
      where,
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            order: true,
            unitId: true,
          },
        },
      },
      orderBy: { lesson: { order: 'asc' } },
    });

    return NextResponse.json(progress);
  } catch (error) {
    console.error('[API /progress GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/progress
 * Update a student's progress on a lesson.
 *
 * Body: { lessonId: string, status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE' }
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
    const { lessonId, status } = body;

    if (!lessonId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: lessonId, status' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify lesson exists
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Upsert progress (create or update)
    const progress = await prisma.studentProgress.upsert({
      where: {
        studentId_lessonId: {
          studentId: user.id,
          lessonId,
        },
      },
      update: {
        status,
        completedAt: status === 'COMPLETE' ? new Date() : null,
      },
      create: {
        studentId: user.id,
        lessonId,
        status,
        completedAt: status === 'COMPLETE' ? new Date() : null,
      },
    });

    return NextResponse.json(progress);
  } catch (error) {
    console.error('[API /progress POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

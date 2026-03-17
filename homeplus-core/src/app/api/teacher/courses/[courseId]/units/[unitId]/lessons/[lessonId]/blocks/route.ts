// ============================================
// Teacher Lesson Block CRUD API — Home Plus LMS
// ============================================
// GET: list blocks for a lesson
// POST: create a new block

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ courseId: string; unitId: string; lessonId: string }>;
}

async function getTeacherIdOrNull(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.id) return null;
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') return null;
  return user.id;
}

// GET /api/teacher/courses/[courseId]/units/[unitId]/lessons/[lessonId]/blocks
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const teacherId = await getTeacherIdOrNull();
  if (!teacherId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { lessonId } = await params;

  const blocks = await prisma.lessonBlock.findMany({
    where: { lessonId },
    orderBy: { order: 'asc' },
  });

  return NextResponse.json(blocks);
}

// POST /api/teacher/courses/[courseId]/units/[unitId]/lessons/[lessonId]/blocks
export async function POST(req: NextRequest, { params }: RouteParams) {
  const teacherId = await getTeacherIdOrNull();
  if (!teacherId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { lessonId } = await params;
  const body = await req.json();
  const { section, blockType, content } = body;

  if (!section || !blockType) {
    return NextResponse.json({ error: 'section and blockType required' }, { status: 400 });
  }

  // Get next order number
  const lastBlock = await prisma.lessonBlock.findFirst({
    where: { lessonId, section },
    orderBy: { order: 'desc' },
  });

  const block = await prisma.lessonBlock.create({
    data: {
      lessonId,
      section,
      blockType,
      content: content || {},
      order: (lastBlock?.order ?? -1) + 1,
    },
  });

  return NextResponse.json(block);
}

// PUT — update a block (via body.blockId)
export async function PUT(req: NextRequest) {
  const teacherId = await getTeacherIdOrNull();
  if (!teacherId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { blockId, content, section, blockType, order } = body;

  if (!blockId) return NextResponse.json({ error: 'blockId required' }, { status: 400 });

  const updated = await prisma.lessonBlock.update({
    where: { id: blockId },
    data: {
      ...(content !== undefined ? { content } : {}),
      ...(section ? { section } : {}),
      ...(blockType ? { blockType } : {}),
      ...(order !== undefined ? { order } : {}),
    },
  });

  return NextResponse.json(updated);
}

// DELETE — delete a block (via query param)
export async function DELETE(req: NextRequest) {
  const teacherId = await getTeacherIdOrNull();
  if (!teacherId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const blockId = req.nextUrl.searchParams.get('blockId');
  if (!blockId) return NextResponse.json({ error: 'blockId required' }, { status: 400 });

  await prisma.lessonBlock.delete({ where: { id: blockId } });
  return NextResponse.json({ ok: true });
}

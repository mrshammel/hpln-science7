// ============================================
// Teacher Lesson CRUD — API Routes
// ============================================
// GET:  List lessons for a unit
// POST: Create a new lesson

import { NextRequest, NextResponse } from 'next/server';
import { getTeacherIdOrNull } from '@/lib/teacher-auth';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ courseId: string; unitId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const teacherId = await getTeacherIdOrNull();
  if (!teacherId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { courseId, unitId } = await params;

  // Verify unit belongs to course
  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit || unit.subjectId !== courseId) {
    return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
  }

  const lessons = await prisma.lesson.findMany({
    where: { unitId },
    orderBy: { order: 'asc' },
    include: {
      _count: { select: { activities: true } },
    },
  });

  return NextResponse.json(lessons.map((l) => ({
    id: l.id,
    title: l.title,
    subtitle: l.subtitle,
    order: l.order,
    activityCount: l._count.activities,
  })));
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const teacherId = await getTeacherIdOrNull();
  if (!teacherId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { courseId, unitId } = await params;
  const body = await request.json();
  const { title, subtitle } = body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'Lesson title is required' }, { status: 400 });
  }

  // Verify unit belongs to course
  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit || unit.subjectId !== courseId) {
    return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
  }

  // Get next order
  const maxOrder = await prisma.lesson.aggregate({
    _max: { order: true },
    where: { unitId },
  });

  const lesson = await prisma.lesson.create({
    data: {
      title: title.trim(),
      subtitle: subtitle?.trim() || null,
      order: (maxOrder._max.order ?? -1) + 1,
      unitId,
    },
  });

  return NextResponse.json(lesson, { status: 201 });
}

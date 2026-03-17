// ============================================
// Teacher Unit CRUD — API Routes
// ============================================
// GET:  List units for a course
// POST: Create a new unit

import { NextRequest, NextResponse } from 'next/server';
import { getTeacherIdOrNull } from '@/lib/teacher-auth';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ courseId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const teacherId = await getTeacherIdOrNull();
  if (!teacherId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { courseId } = await params;

  const units = await prisma.unit.findMany({
    where: { subjectId: courseId },
    orderBy: { order: 'asc' },
    include: {
      _count: { select: { lessons: true } },
    },
  });

  return NextResponse.json(units.map((u) => ({
    id: u.id,
    title: u.title,
    description: u.description,
    icon: u.icon,
    order: u.order,
    lessonCount: u._count.lessons,
  })));
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const teacherId = await getTeacherIdOrNull();
  if (!teacherId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { courseId } = await params;
  const body = await request.json();
  const { title, description, icon } = body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'Unit title is required' }, { status: 400 });
  }

  // Verify course exists
  const course = await prisma.subject.findUnique({ where: { id: courseId } });
  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  // Get next order
  const maxOrder = await prisma.unit.aggregate({
    _max: { order: true },
    where: { subjectId: courseId },
  });

  const unit = await prisma.unit.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      icon: icon || null,
      order: (maxOrder._max.order ?? -1) + 1,
      subjectId: courseId,
    },
  });

  return NextResponse.json(unit, { status: 201 });
}

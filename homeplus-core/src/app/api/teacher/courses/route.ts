// ============================================
// Teacher Course CRUD — API Routes
// ============================================
// GET:  List all courses (for authenticated teacher)
// POST: Create a new course

import { NextRequest, NextResponse } from 'next/server';
import { getTeacherIdOrNull } from '@/lib/teacher-auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const teacherId = await getTeacherIdOrNull();
  if (!teacherId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const courses = await prisma.subject.findMany({
    orderBy: [{ gradeLevel: 'asc' }, { order: 'asc' }, { name: 'asc' }],
    include: {
      units: {
        select: {
          id: true,
          _count: { select: { lessons: true } },
        },
      },
    },
  });

  const formatted = courses.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    gradeLevel: c.gradeLevel,
    order: c.order,
    active: c.active,
    unitCount: c.units.length,
    lessonCount: c.units.reduce((sum, u) => sum + u._count.lessons, 0),
  }));

  return NextResponse.json(formatted);
}

export async function POST(request: NextRequest) {
  const teacherId = await getTeacherIdOrNull();
  if (!teacherId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, gradeLevel, icon } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Course name is required' }, { status: 400 });
  }
  if (!gradeLevel || typeof gradeLevel !== 'number' || gradeLevel < 1 || gradeLevel > 9) {
    return NextResponse.json({ error: 'Grade level must be 1-9' }, { status: 400 });
  }

  // Get next order value
  const maxOrder = await prisma.subject.aggregate({
    _max: { order: true },
    where: { gradeLevel },
  });

  const course = await prisma.subject.create({
    data: {
      name: name.trim(),
      gradeLevel,
      icon: icon || '📚',
      order: (maxOrder._max.order ?? -1) + 1,
      active: true,
    },
  });

  return NextResponse.json(course, { status: 201 });
}

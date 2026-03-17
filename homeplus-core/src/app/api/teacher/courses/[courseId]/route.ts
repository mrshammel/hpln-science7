// ============================================
// Teacher Course Detail — API Routes
// ============================================
// PUT:    Update course metadata
// DELETE: Delete course (cascades to units/lessons)

import { NextRequest, NextResponse } from 'next/server';
import { getTeacherIdOrNull } from '@/lib/teacher-auth';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ courseId: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const teacherId = await getTeacherIdOrNull();
  if (!teacherId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { courseId } = await params;
  const body = await request.json();
  const { name, icon, gradeLevel, active } = body;

  // Verify course exists
  const existing = await prisma.subject.findUnique({ where: { id: courseId } });
  if (!existing) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  const updateData: Record<string, any> = {};
  if (name !== undefined) updateData.name = name.trim();
  if (icon !== undefined) updateData.icon = icon;
  if (gradeLevel !== undefined) updateData.gradeLevel = gradeLevel;
  if (active !== undefined) updateData.active = active;

  const updated = await prisma.subject.update({
    where: { id: courseId },
    data: updateData,
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const teacherId = await getTeacherIdOrNull();
  if (!teacherId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { courseId } = await params;

  const existing = await prisma.subject.findUnique({ where: { id: courseId } });
  if (!existing) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  // Cascade delete is handled by Prisma schema
  await prisma.subject.delete({ where: { id: courseId } });

  return NextResponse.json({ success: true });
}

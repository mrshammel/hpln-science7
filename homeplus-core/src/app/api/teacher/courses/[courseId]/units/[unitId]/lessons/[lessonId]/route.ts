// ============================================
// Teacher Lesson Detail — API Routes
// ============================================
// PUT:    Update lesson metadata
// DELETE: Delete lesson

import { NextRequest, NextResponse } from 'next/server';
import { getTeacherIdOrNull } from '@/lib/teacher-auth';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ courseId: string; unitId: string; lessonId: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const teacherId = await getTeacherIdOrNull();
  if (!teacherId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { courseId, unitId, lessonId } = await params;
  const body = await request.json();

  const existing = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { unit: { select: { subjectId: true } } },
  });
  if (!existing || existing.unitId !== unitId || existing.unit.subjectId !== courseId) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  const updateData: Record<string, any> = {};
  if (body.title !== undefined) updateData.title = body.title.trim();
  if (body.subtitle !== undefined) updateData.subtitle = body.subtitle?.trim() || null;
  if (body.order !== undefined) updateData.order = body.order;
  // Universal Lesson Frame fields
  if (body.estimatedMinutes !== undefined) updateData.estimatedMinutes = body.estimatedMinutes;
  if (body.learningGoal !== undefined) updateData.learningGoal = body.learningGoal;
  if (body.successCriteria !== undefined) updateData.successCriteria = body.successCriteria;
  if (body.materials !== undefined) updateData.materials = body.materials;
  if (body.subjectMode !== undefined) updateData.subjectMode = body.subjectMode;
  if (body.reflectionPrompt !== undefined) updateData.reflectionPrompt = body.reflectionPrompt;
  if (body.masteryConfig !== undefined) updateData.masteryConfig = body.masteryConfig;
  if (body.warmUpConfig !== undefined) updateData.warmUpConfig = body.warmUpConfig;

  const updated = await prisma.lesson.update({
    where: { id: lessonId },
    data: updateData,
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const teacherId = await getTeacherIdOrNull();
  if (!teacherId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { courseId, unitId, lessonId } = await params;

  const existing = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { unit: { select: { subjectId: true } } },
  });
  if (!existing || existing.unitId !== unitId || existing.unit.subjectId !== courseId) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  await prisma.lesson.delete({ where: { id: lessonId } });

  return NextResponse.json({ success: true });
}

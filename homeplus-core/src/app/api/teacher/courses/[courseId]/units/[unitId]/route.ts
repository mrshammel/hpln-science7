// ============================================
// Teacher Unit Detail — API Routes
// ============================================
// PUT:    Update unit metadata
// DELETE: Delete unit (cascades to lessons)

import { NextRequest, NextResponse } from 'next/server';
import { getTeacherIdOrNull } from '@/lib/teacher-auth';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ courseId: string; unitId: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const teacherId = await getTeacherIdOrNull();
  if (!teacherId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { courseId, unitId } = await params;
  const body = await request.json();
  const { title, description, icon, order } = body;

  const existing = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!existing || existing.subjectId !== courseId) {
    return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
  }

  const updateData: Record<string, any> = {};
  if (title !== undefined) updateData.title = title.trim();
  if (description !== undefined) updateData.description = description?.trim() || null;
  if (icon !== undefined) updateData.icon = icon || null;
  if (order !== undefined) updateData.order = order;

  const updated = await prisma.unit.update({
    where: { id: unitId },
    data: updateData,
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const teacherId = await getTeacherIdOrNull();
  if (!teacherId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { courseId, unitId } = await params;

  const existing = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!existing || existing.subjectId !== courseId) {
    return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
  }

  await prisma.unit.delete({ where: { id: unitId } });

  return NextResponse.json({ success: true });
}

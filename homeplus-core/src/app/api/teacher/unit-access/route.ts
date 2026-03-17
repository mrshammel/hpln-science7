// ============================================
// Teacher Unit Access Override API — Home Plus LMS
// ============================================
// POST   — create/update per-student unit override
// DELETE — clear override and restore default progression
// GET    — fetch overrides for a student
//
// All endpoints require teacher auth + student ownership.

import { NextRequest, NextResponse } from 'next/server';
import { getTeacherIdOrNull } from '@/lib/teacher-auth';
import { prisma } from '@/lib/db';

// ---------- GET: Fetch overrides for a student ----------

export async function GET(req: NextRequest) {
  const teacherId = await getTeacherIdOrNull();
  if (!teacherId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const studentId = req.nextUrl.searchParams.get('studentId');
  if (!studentId) {
    return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
  }

  // Verify teacher owns this student
  const student = await prisma.user.findFirst({
    where: { id: studentId, assignedTeacherId: teacherId },
    select: { id: true },
  });
  if (!student) {
    return NextResponse.json({ error: 'Student not found or not assigned to you' }, { status: 403 });
  }

  const overrides = await (prisma as any).studentUnitAccess.findMany({
    where: { studentId },
    include: {
      unit: { select: { id: true, title: true, order: true, icon: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ overrides });
}

// ---------- POST: Create or update an override ----------

export async function POST(req: NextRequest) {
  const teacherId = await getTeacherIdOrNull();
  if (!teacherId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { studentId, unitId, overrideState, note } = body;

  if (!studentId || !unitId || !overrideState) {
    return NextResponse.json({ error: 'studentId, unitId, and overrideState are required' }, { status: 400 });
  }

  // Validate override state
  const validStates = ['NONE', 'UNLOCKED', 'COMPLETED', 'EXEMPT'];
  if (!validStates.includes(overrideState)) {
    return NextResponse.json({ error: `overrideState must be one of: ${validStates.join(', ')}` }, { status: 400 });
  }

  // Verify teacher owns this student
  const student = await prisma.user.findFirst({
    where: { id: studentId, assignedTeacherId: teacherId },
    select: { id: true },
  });
  if (!student) {
    return NextResponse.json({ error: 'Student not found or not assigned to you' }, { status: 403 });
  }

  // Verify unit exists
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { id: true, title: true },
  });
  if (!unit) {
    return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
  }

  // If state is NONE, remove override instead
  if (overrideState === 'NONE') {
    try {
      await (prisma as any).studentUnitAccess.delete({
        where: { studentId_unitId: { studentId, unitId } },
      });
    } catch {
      // Record may not exist — that's fine
    }
    return NextResponse.json({ success: true, action: 'cleared' });
  }

  // Upsert override
  const override = await (prisma as any).studentUnitAccess.upsert({
    where: { studentId_unitId: { studentId, unitId } },
    create: {
      studentId,
      unitId,
      overrideState,
      note: note?.trim() || null,
      teacherId,
    },
    update: {
      overrideState,
      note: note?.trim() || null,
      teacherId,
    },
  });

  return NextResponse.json({ success: true, override });
}

// ---------- DELETE: Clear an override ----------

export async function DELETE(req: NextRequest) {
  const teacherId = await getTeacherIdOrNull();
  if (!teacherId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { studentId, unitId } = body;

  if (!studentId || !unitId) {
    return NextResponse.json({ error: 'studentId and unitId are required' }, { status: 400 });
  }

  // Verify teacher owns this student
  const student = await prisma.user.findFirst({
    where: { id: studentId, assignedTeacherId: teacherId },
    select: { id: true },
  });
  if (!student) {
    return NextResponse.json({ error: 'Student not found or not assigned to you' }, { status: 403 });
  }

  try {
    await (prisma as any).studentUnitAccess.delete({
      where: { studentId_unitId: { studentId, unitId } },
    });
  } catch {
    // Record may not exist — that's fine
  }

  return NextResponse.json({ success: true, action: 'cleared' });
}

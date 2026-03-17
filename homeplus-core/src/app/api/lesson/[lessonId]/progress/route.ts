// ============================================
// Lesson Progress API — Home Plus LMS
// ============================================
// GET: current progress for lesson
// POST: update section completion / status

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ lessonId: string }>;
}

// GET /api/lesson/[lessonId]/progress
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { lessonId } = await params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const progress = await prisma.studentProgress.findUnique({
    where: { studentId_lessonId: { studentId: userId, lessonId } },
  });

  return NextResponse.json(progress || { status: 'NOT_STARTED', sectionsData: null, masteryScore: null });
}

// POST /api/lesson/[lessonId]/progress
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { lessonId } = await params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { sectionsData, status, masteryScore } = body;

  const completedAt = status === 'MASTERED' || status === 'COMPLETE' ? new Date() : undefined;

  const progress = await prisma.studentProgress.upsert({
    where: { studentId_lessonId: { studentId: userId, lessonId } },
    create: {
      studentId: userId,
      lessonId,
      status: status || 'IN_PROGRESS',
      ...(sectionsData !== undefined ? { sectionsData } : {}),
      ...(masteryScore !== undefined && masteryScore !== null ? { masteryScore } : {}),
      ...(completedAt ? { completedAt } : {}),
    },
    update: {
      ...(status ? { status } : {}),
      ...(sectionsData !== undefined ? { sectionsData } : {}),
      ...(masteryScore !== undefined && masteryScore !== null ? { masteryScore } : {}),
      ...(completedAt ? { completedAt } : {}),
    },
  });

  return NextResponse.json(progress);
}

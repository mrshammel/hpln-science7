// ============================================
// Reflection API — Home Plus LMS (Phase 2 Retrofit)
// ============================================
// POST: saves structured reflection with confidence rating,
//       help request, and metacognition data to ReflectionEntry.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { refreshStudentDashboardSummary } from '@/lib/summary-service';

interface RouteParams {
  params: Promise<{ lessonId: string }>;
}

// POST /api/lesson/[lessonId]/reflection
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { lessonId } = await params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    reflectionText,
    confidenceRating, // 1-5 scale → maps to confidenceAfter
    helpRequested,    // boolean
  } = body;

  if (!reflectionText?.trim()) {
    return NextResponse.json({ error: 'Reflection text required' }, { status: 400 });
  }

  const confidenceInt = confidenceRating != null ? Number(confidenceRating) : null;

  // Create or update ReflectionEntry
  const existing = await prisma.reflectionEntry.findFirst({
    where: { studentId: userId, lessonId },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    await prisma.reflectionEntry.update({
      where: { id: existing.id },
      data: {
        reflectionText: reflectionText.trim(),
        confidenceAfter: confidenceInt ?? existing.confidenceAfter,
        helpRequested: helpRequested ?? existing.helpRequested,
      },
    });
  } else {
    await prisma.reflectionEntry.create({
      data: {
        studentId: userId,
        lessonId,
        reflectionText: reflectionText.trim(),
        confidenceAfter: confidenceInt,
        helpRequested: helpRequested === true,
      },
    });
  }

  // If help was requested, increment helpRequestedCount on mastery records
  if (helpRequested) {
    const lessonSkills = await prisma.lessonSkill.findMany({
      where: { lessonId, relationshipType: 'TARGET' },
      select: { skillId: true },
    });

    for (const ls of lessonSkills) {
      await prisma.studentSkillMastery.updateMany({
        where: { studentId: userId, skillId: ls.skillId },
        data: { helpRequestedCount: { increment: 1 } },
      });
    }
  }

  // Refresh summary
  try {
    await refreshStudentDashboardSummary(userId);
  } catch (e) {
    console.error('[reflection] Summary refresh failed:', e);
  }

  return NextResponse.json({ ok: true });
}

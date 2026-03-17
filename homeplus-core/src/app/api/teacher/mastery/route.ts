import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getTeacherId } from '@/lib/teacher-auth';

/**
 * POST /api/teacher/mastery
 * Create or update a mastery judgment independently.
 *
 * Body: {
 *   studentId: string,
 *   outcomeId: string,
 *   masteryLevel: string,
 *   submissionId?: string,
 *   teacherNote?: string,
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const teacherId = await getTeacherId();
    const body = await req.json();
    const { studentId, outcomeId, masteryLevel, submissionId, teacherNote } = body;

    if (!studentId || !outcomeId || !masteryLevel) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, outcomeId, masteryLevel' },
        { status: 400 },
      );
    }

    // Verify student is assigned to this teacher
    const student = await prisma.user.findFirst({
      where: { id: studentId, role: 'STUDENT', assignedTeacherId: teacherId },
      select: { id: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found or not authorized' }, { status: 404 });
    }

    // Check for existing judgment for this student + outcome
    const existing = await prisma.masteryJudgment.findFirst({
      where: { studentId, outcomeId, teacherId },
      orderBy: { assessedAt: 'desc' },
    });

    let judgment;
    if (existing) {
      judgment = await prisma.masteryJudgment.update({
        where: { id: existing.id },
        data: {
          masteryLevel,
          teacherNote: teacherNote || null,
          submissionId: submissionId || null,
          assessedAt: new Date(),
        },
      });
    } else {
      judgment = await prisma.masteryJudgment.create({
        data: {
          studentId,
          outcomeId,
          teacherId,
          masteryLevel,
          teacherNote: teacherNote || null,
          submissionId: submissionId || null,
        },
      });
    }

    return NextResponse.json({ success: true, judgment });
  } catch (error) {
    console.error('[API /teacher/mastery POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

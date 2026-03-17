import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getTeacherId } from '@/lib/teacher-auth';

/**
 * POST /api/teacher/review
 * Save teacher feedback, update score, mark submission as reviewed,
 * and optionally update mastery judgments.
 *
 * Body: {
 *   submissionId: string,
 *   feedback?: string,
 *   score?: number,
 *   masteryUpdates?: { outcomeId: string, level: string, note?: string }[]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const teacherId = await getTeacherId();
    const body = await req.json();
    const { submissionId, feedback, score, masteryUpdates } = body;

    if (!submissionId) {
      return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
    }

    // Verify submission belongs to a student assigned to this teacher
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        student: { assignedTeacherId: teacherId },
      },
      select: { id: true, studentId: true },
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found or not authorized' }, { status: 404 });
    }

    // Update submission: mark reviewed, save feedback, update score, finalize
    const updateData: Record<string, unknown> = {
      reviewed: true,
      reviewedAt: new Date(),
      reviewedBy: teacherId,
      finalizedByTeacher: true,
    };
    if (feedback !== undefined) updateData.teacherFeedback = feedback;
    if (score !== undefined) updateData.score = parseFloat(score);

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: updateData,
    });

    // Upsert mastery judgments if provided
    if (masteryUpdates && Array.isArray(masteryUpdates)) {
      for (const mu of masteryUpdates) {
        if (!mu.outcomeId || !mu.level) continue;

        // Check for existing judgment for this student + outcome
        const existing = await prisma.masteryJudgment.findFirst({
          where: {
            studentId: submission.studentId,
            outcomeId: mu.outcomeId,
            teacherId,
          },
          orderBy: { assessedAt: 'desc' },
        });

        if (existing) {
          await prisma.masteryJudgment.update({
            where: { id: existing.id },
            data: {
              masteryLevel: mu.level,
              teacherNote: mu.note || null,
              submissionId: submissionId,
              assessedAt: new Date(),
            },
          });
        } else {
          await prisma.masteryJudgment.create({
            data: {
              studentId: submission.studentId,
              outcomeId: mu.outcomeId,
              teacherId,
              masteryLevel: mu.level,
              teacherNote: mu.note || null,
              submissionId: submissionId,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, submission: updated });
  } catch (error) {
    console.error('[API /teacher/review POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

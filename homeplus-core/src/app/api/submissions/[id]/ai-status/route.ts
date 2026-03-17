import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/submissions/[id]/ai-status
 * Polling endpoint for student to check AI feedback generation status.
 * Returns aiStatus and, if complete, the full AI feedback payload.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const submission = await prisma.submission.findUnique({
      where: { id },
      select: {
        id: true,
        aiStatus: true,
        aiFeedback: true,
        aiStrengths: true,
        aiAreasForImprovement: true,
        aiNextSteps: true,
        aiProvisionalScore: true,
        aiPerformanceLevel: true,
        aiGeneratedAt: true,
        maxScore: true,
        // Teacher review status for combined view
        reviewed: true,
        teacherFeedback: true,
        score: true,
        finalizedByTeacher: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Return the AI status and feedback if available
    if (submission.aiStatus === 'COMPLETE') {
      return NextResponse.json({
        aiStatus: 'COMPLETE',
        aiFeedback: submission.aiFeedback,
        aiStrengths: submission.aiStrengths,
        aiAreasForImprovement: submission.aiAreasForImprovement,
        aiNextSteps: submission.aiNextSteps,
        aiProvisionalScore: submission.aiProvisionalScore,
        aiPerformanceLevel: submission.aiPerformanceLevel,
        aiGeneratedAt: submission.aiGeneratedAt,
        maxScore: submission.maxScore,
        // Include teacher data so student can see final grade if reviewed
        teacherReviewed: submission.reviewed,
        teacherFeedback: submission.teacherFeedback,
        teacherScore: submission.score,
        finalizedByTeacher: submission.finalizedByTeacher,
      });
    }

    return NextResponse.json({
      aiStatus: submission.aiStatus,
    });
  } catch (error) {
    console.error('[API /submissions/[id]/ai-status] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

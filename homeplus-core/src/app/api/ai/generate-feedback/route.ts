import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateWritingFeedback, isEligibleForAiFeedback } from '@/lib/ai-feedback';

/**
 * POST /api/ai/generate-feedback
 * Internal endpoint: generates AI formative feedback for a submission.
 * Called asynchronously after submission save.
 *
 * Body: { submissionId: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Validate the internal call (basic security — could add a secret header later)
    const body = await req.json();
    const { submissionId } = body;

    if (!submissionId) {
      return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
    }

    // Fetch the submission with activity context
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        activity: {
          include: {
            lesson: {
              include: {
                unit: {
                  include: {
                    subject: { select: { gradeLevel: true } },
                  },
                },
              },
            },
          },
        },
        student: { select: { gradeLevel: true } },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (!submission.writtenResponse) {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { aiStatus: 'FAILED', aiErrorMessage: 'No written response found' },
      });
      return NextResponse.json({ error: 'No written response' }, { status: 400 });
    }

    if (!isEligibleForAiFeedback(submission.submissionType)) {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { aiStatus: 'NONE' },
      });
      return NextResponse.json({ message: 'Not eligible for AI feedback' });
    }

    // Extract activity content for prompt context
    const activityContent = submission.activity.content as Record<string, unknown> | null;
    const activityPrompt = activityContent?.prompt as string | undefined;
    const rubric = activityContent?.rubric as { criterion: string; maxPoints: number }[] | undefined;

    const gradeLevel =
      submission.student.gradeLevel ||
      submission.activity.lesson.unit.subject.gradeLevel ||
      7;

    // Generate AI feedback
    const result = await generateWritingFeedback({
      writtenResponse: submission.writtenResponse,
      activityTitle: submission.activity.title,
      activityPrompt,
      gradeLevel,
      maxScore: submission.maxScore || undefined,
      submissionType: submission.submissionType,
      rubric,
    });

    // Store AI results on the submission
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        aiStatus: 'COMPLETE',
        aiFeedback: result.overallFeedback,
        aiStrengths: result.strengths,
        aiAreasForImprovement: result.areasForImprovement,
        aiNextSteps: result.nextSteps,
        aiProvisionalScore: result.provisionalScore,
        aiPerformanceLevel: result.performanceLevel,
        aiGeneratedAt: new Date(),
        aiModelVersion: result.modelVersion,
        aiErrorMessage: null,
      },
    });

    return NextResponse.json({ success: true, performanceLevel: result.performanceLevel });
  } catch (error) {
    console.error('[API /ai/generate-feedback] Error:', error);

    // Mark AI as failed so the UI can show appropriate state
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.submissionId) {
        await prisma.submission.update({
          where: { id: body.submissionId },
          data: {
            aiStatus: 'FAILED',
            aiErrorMessage: error instanceof Error ? error.message : 'Unknown AI generation error',
          },
        });
      }
    } catch {
      // Ignore update errors in error handler
    }

    return NextResponse.json({ error: 'AI feedback generation failed' }, { status: 500 });
  }
}

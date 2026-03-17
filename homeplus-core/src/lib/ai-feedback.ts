// ============================================
// AI Writing Feedback Service — Home Plus LMS
// ============================================
// Generates formative AI feedback on student written work.
// Uses Google Gemini for structured writing analysis.
// AI feedback is PROVISIONAL — teacher review is FINAL.

import { GoogleGenerativeAI } from '@google/generative-ai';

// ---------- Types ----------

export interface AiFeedbackResult {
  overallFeedback: string;
  strengths: string;
  areasForImprovement: string;
  nextSteps: string;
  provisionalScore: number | null;
  performanceLevel: 'EMERGING' | 'APPROACHING' | 'MEETING' | 'EXCEEDING';
  modelVersion: string;
}

export interface AiFeedbackInput {
  writtenResponse: string;
  activityTitle: string;
  activityPrompt?: string;
  gradeLevel: number;
  maxScore?: number;
  submissionType: string;
  rubric?: { criterion: string; maxPoints: number }[];
}

// ---------- Constants ----------

const ELIGIBLE_TYPES = new Set([
  'SHORT_ANSWER',
  'PARAGRAPH_RESPONSE',
  'ESSAY',
  'REFLECTION',
]);

const MODEL_NAME = 'gemini-2.0-flash';

// ---------- Helpers ----------

/** Check if a submission type is eligible for AI feedback */
export function isEligibleForAiFeedback(submissionType: string): boolean {
  return ELIGIBLE_TYPES.has(submissionType);
}

/** Build the system prompt for formative writing feedback */
function buildSystemPrompt(input: AiFeedbackInput): string {
  const gradeDesc =
    input.gradeLevel <= 3
      ? `an early elementary student (Grade ${input.gradeLevel})`
      : input.gradeLevel <= 6
        ? `an upper elementary student (Grade ${input.gradeLevel})`
        : `a middle school student (Grade ${input.gradeLevel})`;

  let rubricSection = '';
  if (input.rubric && input.rubric.length > 0) {
    rubricSection = `\n\nRubric criteria for this assignment:\n${input.rubric.map((r) => `- ${r.criterion} (up to ${r.maxPoints} points)`).join('\n')}`;
  }

  let scoreInstruction = '';
  if (input.maxScore) {
    scoreInstruction = `\nAlso provide a provisional numeric score out of ${input.maxScore}. This is an estimate — the teacher will assign the final score.`;
  }

  return `You are a supportive, encouraging writing feedback assistant for ${gradeDesc} in an Alberta, Canada school. Your role is to provide formative feedback that helps the student grow as a writer.

Assignment: "${input.activityTitle}"
Submission type: ${input.submissionType}
${input.activityPrompt ? `Prompt: "${input.activityPrompt}"` : ''}${rubricSection}

Instructions:
- Evaluate the student's written response for: completeness, clarity, organization, evidence/details, and alignment to the prompt.
- Write feedback that is supportive, age-appropriate for Grade ${input.gradeLevel}, specific, and constructive.
- Never be harsh, punitive, or robotic.
- Use simple, clear language appropriate for the student's grade level.
- Be honest but kind — acknowledge effort and progress.${scoreInstruction}

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "overallFeedback": "2-3 sentence overall summary of the submission quality",
  "strengths": "2-3 specific things the student did well, as a short paragraph",
  "areasForImprovement": "2-3 specific areas where the student could improve, as a short paragraph",
  "nextSteps": "1-2 concrete, actionable revision suggestions the student could try next",
  "performanceLevel": "one of: EMERGING, APPROACHING, MEETING, EXCEEDING"${input.maxScore ? `,\n  "provisionalScore": <number from 0 to ${input.maxScore}>` : ''}
}`;
}

// ---------- Main Function ----------

/**
 * Generate AI formative feedback for student written work.
 * Returns structured feedback result or throws on error.
 */
export async function generateWritingFeedback(
  input: AiFeedbackInput
): Promise<AiFeedbackResult> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY not configured');
  }

  if (!input.writtenResponse || input.writtenResponse.trim().length < 10) {
    throw new Error('Written response too short for meaningful feedback');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const systemPrompt = buildSystemPrompt(input);
  const userMessage = `Student's written response:\n\n${input.writtenResponse}`;

  const result = await model.generateContent({
    contents: [
      { role: 'user', parts: [{ text: `${systemPrompt}\n\n---\n\n${userMessage}` }] },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  });

  const responseText = result.response.text();

  // Parse the JSON response
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    // Try to extract JSON from markdown code blocks if present
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1].trim());
    } else {
      throw new Error(`Failed to parse AI response as JSON: ${responseText.slice(0, 200)}`);
    }
  }

  // Validate and normalize the performance level
  const validLevels = ['EMERGING', 'APPROACHING', 'MEETING', 'EXCEEDING'];
  let level = String(parsed.performanceLevel || 'APPROACHING').toUpperCase();
  if (!validLevels.includes(level)) level = 'APPROACHING';

  // Normalize provisional score
  let provisionalScore: number | null = null;
  if (input.maxScore && parsed.provisionalScore !== undefined) {
    provisionalScore = Math.min(
      Math.max(0, Number(parsed.provisionalScore)),
      input.maxScore
    );
    provisionalScore = Math.round(provisionalScore * 2) / 2; // Round to nearest 0.5
  }

  return {
    overallFeedback: String(parsed.overallFeedback || ''),
    strengths: String(parsed.strengths || ''),
    areasForImprovement: String(parsed.areasForImprovement || ''),
    nextSteps: String(parsed.nextSteps || ''),
    provisionalScore,
    performanceLevel: level as AiFeedbackResult['performanceLevel'],
    modelVersion: MODEL_NAME,
  };
}

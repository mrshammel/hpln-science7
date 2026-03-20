// ============================================
// AI Feedback API — Home Plus LMS
// ============================================
// POST: Grade a constructed response using Gemini API (or rubric fallback),
// return formative feedback with a tentative score.
//
// Payload: { blockId, prompt, rubricHint, studentResponse, minLength?, teacherReviewRequired? }
// Returns: { score, feedback, strengths, improvements, disclaimer }

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';


interface RouteParams {
  params: Promise<{ lessonId: string }>;
}

interface FeedbackRequest {

  prompt: string;
  rubricHint?: string;
  studentResponse: string;
  minLength?: number;
  teacherReviewRequired?: boolean;
}

interface FeedbackResponse {
  score: number;           // 0-100
  feedback: string;        // summary paragraph
  strengths: string[];     // things the student did well
  improvements: string[];  // areas to improve
  disclaimer: string;      // always present
}

const DISCLAIMER = 'This is AI-generated feedback to help you improve. Your final grade will be reviewed and assigned by your teacher.';

// ─── Gemini API feedback ───
async function getGeminiFeedback(
  prompt: string,
  rubricHint: string,
  studentResponse: string,
  teacherReviewRequired: boolean,
): Promise<FeedbackResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('No Gemini API key');

  const systemPrompt = `You are a supportive Grade 7 Science teacher providing formative feedback on a student's written response.

TASK: Evaluate the student's response to the given prompt and provide constructive feedback.

RUBRIC GUIDANCE: ${rubricHint || 'Assess for accuracy, completeness, use of key vocabulary, and clear explanation.'}

RULES:
- Be encouraging and specific — highlight what the student did well FIRST
- Give 2-3 specific strengths
- Give 1-2 specific, actionable improvements (not vague)
- Score from 0-100 where:
  - 90-100: Excellent — thorough, accurate, well-explained
  - 75-89: Good — mostly complete, some details missing
  - 60-74: Developing — basic understanding shown, needs more depth
  - 40-59: Beginning — partial understanding, significant gaps
  - 0-39: Incomplete — major content missing or incorrect
- Keep feedback at a Grade 7 reading level
- Be warm, not harsh
- Reference specific parts of their answer

${teacherReviewRequired ? 'NOTE: This is a major assignment that will also be reviewed by the teacher. Your feedback should help the student revise before final submission.' : ''}

Respond ONLY with valid JSON in this format:
{
  "score": <number 0-100>,
  "feedback": "<1-2 sentence summary>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>"]
}`;

  const userPrompt = `PROMPT THE STUDENT WAS ASKED:
${prompt}

STUDENT'S RESPONSE:
${studentResponse}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
          responseMimeType: 'application/json',
        },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('[AI Feedback] Gemini API error:', err);
    throw new Error('Gemini API error');
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');

  const parsed = JSON.parse(text);
  return {
    score: Math.max(0, Math.min(100, Number(parsed.score) || 50)),
    feedback: parsed.feedback || 'Good effort! Keep working on this.',
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : ['You attempted the response'],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 3) : ['Add more detail to strengthen your answer'],
    disclaimer: DISCLAIMER,
  };
}

// ─── Rubric-based fallback (no AI API key) ───
function getRubricFallback(
  prompt: string,
  rubricHint: string,
  studentResponse: string,
  minLength: number,
): FeedbackResponse {
  const response = studentResponse.trim();
  const wordCount = response.split(/\s+/).filter(Boolean).length;
  const sentenceCount = response.split(/[.!?]+/).filter(Boolean).length;

  // Extract keywords from rubric hint and prompt
  const rubricLower = (rubricHint + ' ' + prompt).toLowerCase();
  const keyTerms = extractKeyTerms(rubricLower);
  const responseLower = response.toLowerCase();

  // Score components
  let lengthScore = 0;
  let keywordScore = 0;
  let structureScore = 0;

  // 1. Length scoring (40 points max)
  const targetWords = Math.max(minLength || 40, 40);
  if (wordCount >= targetWords) {
    lengthScore = 40;
  } else if (wordCount >= targetWords * 0.7) {
    lengthScore = 30;
  } else if (wordCount >= targetWords * 0.4) {
    lengthScore = 20;
  } else if (wordCount >= 10) {
    lengthScore = 10;
  }

  // 2. Keyword coverage (40 points max)
  const matchedTerms = keyTerms.filter((t) => responseLower.includes(t));
  const coverage = keyTerms.length > 0 ? matchedTerms.length / keyTerms.length : 0.5;
  keywordScore = Math.round(coverage * 40);

  // 3. Structure (20 points max)
  if (sentenceCount >= 4) structureScore += 10;
  else if (sentenceCount >= 2) structureScore += 5;

  // Uses explanation words
  const explanationWords = ['because', 'therefore', 'this means', 'for example', 'such as', 'which shows', 'this is why', 'as a result'];
  const usesExplanation = explanationWords.some((w) => responseLower.includes(w));
  if (usesExplanation) structureScore += 10;

  const score = Math.min(100, lengthScore + keywordScore + structureScore);

  // Build feedback
  const strengths: string[] = [];
  const improvements: string[] = [];

  if (wordCount >= targetWords) {
    strengths.push('Your response has good length and detail.');
  } else {
    improvements.push(`Try to write more — aim for at least ${targetWords} words (you wrote ${wordCount}).`);
  }

  if (coverage >= 0.6) {
    strengths.push('You used important key vocabulary from the lesson.');
  } else if (keyTerms.length > 0) {
    const missing = keyTerms.filter((t) => !responseLower.includes(t)).slice(0, 3);
    improvements.push(`Try to include more key terms like: ${missing.join(', ')}.`);
  }

  if (usesExplanation) {
    strengths.push('Great job explaining your thinking with reasoning words.');
  } else {
    improvements.push('Try adding explanation words like "because", "for example", or "this means" to explain your reasoning.');
  }

  if (sentenceCount >= 3) {
    strengths.push('Your answer is well-structured with multiple sentences.');
  }

  if (strengths.length === 0) strengths.push('You made an attempt at answering the question.');
  if (improvements.length === 0) improvements.push('Keep up the great work!');

  let feedback: string;
  if (score >= 80) {
    feedback = 'Strong response! You showed good understanding of the topic.';
  } else if (score >= 60) {
    feedback = 'Good start! You covered some important ideas. Adding more detail would strengthen your answer.';
  } else if (score >= 40) {
    feedback = 'You\'re on the right track. Try to include more specific details and vocabulary from the lesson.';
  } else {
    feedback = 'This is a good start, but your answer needs more detail. Review the lesson content and try to be more specific.';
  }

  return { score, feedback, strengths, improvements, disclaimer: DISCLAIMER };
}

/** Extract key science terms from prompt + rubric text */
function extractKeyTerms(text: string): string[] {
  // Common science terms that appear in Grade 7 ecosystems curriculum
  const scienceTerms = [
    'ecosystem', 'biotic', 'abiotic', 'producer', 'consumer', 'decomposer',
    'food chain', 'food web', 'predator', 'prey', 'symbiosis', 'mutualism',
    'commensalism', 'parasitism', 'competition', 'population', 'community',
    'habitat', 'niche', 'biodiversity', 'species', 'organism',
    'photosynthesis', 'energy', 'trophic', 'herbivore', 'carnivore', 'omnivore',
    'succession', 'invasive', 'endangered', 'conservation', 'stewardship',
    'sustainability', 'pollution', 'deforestation', 'habitat loss',
    'indicator species', 'monitoring', 'water quality', 'restoration',
    'protected area', 'food pyramid', 'energy pyramid', '10% rule',
    'bioaccumulation', 'biomagnification', 'citizen science',
  ];

  return scienceTerms.filter((term) => text.includes(term));
}

// ─── Main handler ───
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { lessonId } = await params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: FeedbackRequest = await req.json();
  const { prompt, rubricHint, studentResponse, minLength, teacherReviewRequired } = body;

  if (!studentResponse?.trim()) {
    return NextResponse.json({ error: 'No response provided' }, { status: 400 });
  }

  // Get AI feedback
  let result: FeedbackResponse;
  try {
    if (process.env.GEMINI_API_KEY) {
      result = await getGeminiFeedback(
        prompt,
        rubricHint || '',
        studentResponse,
        !!teacherReviewRequired,
      );
    } else {
      result = getRubricFallback(
        prompt,
        rubricHint || '',
        studentResponse,
        minLength || 40,
      );
    }
  } catch (e) {
    console.error('[AI Feedback] Error, falling back to rubric:', e);
    result = getRubricFallback(
      prompt,
      rubricHint || '',
      studentResponse,
      minLength || 40,
    );
  }

  return NextResponse.json(result);
}

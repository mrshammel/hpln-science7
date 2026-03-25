import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildComprehensionPrompt, buildAnswerEvaluationPrompt } from '@/lib/reading-tutor-prompts';

const MODEL_NAME = 'gemini-2.0-flash';

/**
 * POST /api/reading-tutor/comprehension
 * Handles comprehension chat — generates questions and evaluates answers.
 * action: 'start' | 'evaluate'
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { action } = body;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    if (action === 'start') {
      // Generate comprehension questions
      const { passageTitle, passageText, gradeLevel, accuracyRate } = body;

      const prompt = buildComprehensionPrompt(
        passageTitle || 'Reading Passage',
        passageText || '',
        gradeLevel || 3,
        accuracyRate ?? 85
      );

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      });

      const responseText = result.response.text();
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        try {
          const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[1].trim()) : {};
        } catch {
          parsed = {};
        }
      }

      const greeting = String(parsed.greeting || "Nice reading! Let's talk about what you just read. 😊");
      const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

      return NextResponse.json({ greeting, questions });
    }

    if (action === 'evaluate') {
      // Evaluate a student's answer
      const { question, questionType, expectedAnswer, studentAnswer, gradeLevel } = body;

      const prompt = buildAnswerEvaluationPrompt(
        question || '',
        questionType || 'literal',
        expectedAnswer || '',
        studentAnswer || '',
        gradeLevel || 3
      );

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 512,
          responseMimeType: 'application/json',
        },
      });

      const responseText = result.response.text();
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        try {
          const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[1].trim()) : {};
        } catch {
          parsed = {};
        }
      }

      return NextResponse.json({
        isCorrect: Boolean(parsed.isCorrect),
        isPartiallyCorrect: Boolean(parsed.isPartiallyCorrect),
        feedback: String(parsed.feedback || "Good thinking! 💭"),
        score: Number(parsed.score || 50),
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[API /reading-tutor/comprehension]', error);
    return NextResponse.json({ error: 'Comprehension failed' }, { status: 500 });
  }
}

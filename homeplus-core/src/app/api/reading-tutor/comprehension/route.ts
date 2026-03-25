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
      const { question, questionType, expectedAnswer, studentAnswer, gradeLevel, passageText } = body;

      // --- Attempt 1: Full Mrs. Hammel evaluation prompt ---
      try {
        const prompt = buildAnswerEvaluationPrompt(
          question || '',
          questionType || 'literal',
          expectedAnswer || '',
          studentAnswer || '',
          gradeLevel || 3,
          passageText || ''
        );

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 512,
            // NOT using responseMimeType: 'application/json' — it causes
            // failures with long prompts on Gemini Flash
          },
        });

        const responseText = result.response.text();
        console.log('[evaluate] Gemini response:', responseText.substring(0, 300));

        // Try multiple JSON extraction strategies
        let parsed: Record<string, unknown> | null = null;

        // Strategy 1: Direct JSON parse
        try { parsed = JSON.parse(responseText); } catch { /* continue */ }

        // Strategy 2: Extract from markdown code block
        if (!parsed) {
          try {
            const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) parsed = JSON.parse(jsonMatch[1].trim());
          } catch { /* continue */ }
        }

        // Strategy 3: Extract JSON object from mixed text
        if (!parsed) {
          try {
            const objMatch = responseText.match(/\{[\s\S]*\}/);
            if (objMatch) parsed = JSON.parse(objMatch[0]);
          } catch { /* continue */ }
        }

        if (parsed?.feedback) {
          return NextResponse.json({
            isCorrect: Boolean(parsed.isCorrect),
            isPartiallyCorrect: Boolean(parsed.isPartiallyCorrect),
            feedback: String(parsed.feedback),
            score: Number(parsed.score || 50),
            source: 'ai',
          });
        }

        // Gemini responded but no JSON — use raw text if it looks like feedback
        const cleanedText = responseText
          .replace(/```[\s\S]*?```/g, '')
          .replace(/\{[\s\S]*?\}/g, '')
          .trim();

        if (cleanedText.length > 10 && cleanedText.length < 500) {
          return NextResponse.json({
            isCorrect: false,
            feedback: cleanedText,
            score: 50,
            source: 'ai-raw',
          });
        }
      } catch (err) {
        console.error('[evaluate] Full prompt failed:', err);
      }

      // --- Attempt 2: Simpler direct prompt without full persona ---
      try {
        console.log('[evaluate] Trying simple fallback prompt...');
        const simplePrompt = `You are a warm elementary reading tutor. A student read a story and was asked: "${question || 'a question about the story'}"

The student answered: "${studentAnswer}"
${passageText ? `\nThe story said: "${passageText.substring(0, 300)}"` : ''}
${expectedAnswer ? `\nA correct answer would mention: "${expectedAnswer}"` : ''}

Is the student's answer correct? Respond as JSON: {"feedback":"your 1-2 sentence response","isCorrect":true or false,"score":0 to 100}

Be honest — if wrong, kindly say so. If correct but brief, ask for more detail.`;

        const result = await model.generateContent(simplePrompt);
        const text = result.response.text();
        console.log('[evaluate] Simple prompt response:', text.substring(0, 200));

        const objMatch = text.match(/\{[\s\S]*\}/);
        if (objMatch) {
          const p = JSON.parse(objMatch[0]);
          if (p.feedback) {
            return NextResponse.json({
              feedback: String(p.feedback),
              isCorrect: Boolean(p.isCorrect),
              score: Number(p.score || 50),
              source: 'ai-simple',
            });
          }
        }
      } catch (err) {
        console.error('[evaluate] Simple prompt also failed:', err);
      }

      // --- Attempt 3: Absolute server fallback (no AI) ---
      return NextResponse.json({
        feedback: "Hmm, let me think about that one! Let's try the next question. 😊",
        isCorrect: false,
        score: 40,
        source: 'server-fallback',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[API /reading-tutor/comprehension] Outer error:', error);
    return NextResponse.json({
      error: 'Comprehension failed',
      feedback: "Oops, I had a little hiccup! Let's keep going. 😊",
      score: 40,
      source: 'error-fallback',
    }, { status: 200 }); // Return 200 so client uses the feedback instead of its own fallback
  }
}

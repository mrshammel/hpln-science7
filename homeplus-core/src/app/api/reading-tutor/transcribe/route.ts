import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL_NAME = 'gemini-2.0-flash';

/**
 * POST /api/reading-tutor/transcribe
 * Server-side speech-to-text using Gemini's audio understanding.
 * Used as fallback when browser Web Speech API captures an incomplete transcript.
 *
 * Body: { audioBase64: string, mimeType: string, passageText?: string }
 * Returns: { transcript: string }
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { audioBase64, mimeType, passageText } = body;

    if (!audioBase64) {
      return NextResponse.json({ error: 'No audio data provided' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Build a prompt that helps Gemini focus on accurate transcription
    const transcriptionPrompt = passageText
      ? `You are a reading tutor transcription engine. A student just read this passage aloud:

"${passageText}"

Listen to the audio and transcribe EXACTLY what the student said, word for word. Include every word they spoke, even if they:
- Mispronounced words
- Repeated words
- Added filler words (um, uh, like)
- Skipped or substituted words
- Read in a different order

CRITICAL: Return ONLY the raw transcript text with no formatting, no quotes, no explanation. Just the words the student spoke.`
      : `Transcribe this audio exactly, word for word. Return ONLY the raw transcript text with no formatting, no quotes, no explanation. Just the words spoken.`;

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: audioBase64,
              },
            },
            { text: transcriptionPrompt },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
    });

    const transcript = result.response.text().trim();

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error('[API /reading-tutor/transcribe]', error);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import styles from '../reading-tutor.module.css';

// ---------- Types ----------
interface Passage {
  id: string;
  title: string;
  text: string;
  wordCount: number;
  lexileLevel: number;
  gradeLevel: number;
}

interface WordResult {
  position: number;
  expected: string;
  actual: string | null;
  status: 'CORRECT' | 'SUBSTITUTION' | 'OMISSION' | 'INSERTION' | 'FILTERED';
}

interface AnalysisResult {
  totalWords: number;
  correctWords: number;
  adjustedAccuracy: number;
  wordsPerMinute: number;
  wordResults: WordResult[];
  miscueCount: number;
  filteredMiscues: number;
}

interface ChatMessage {
  role: 'tutor' | 'student';
  text: string;
}

type SessionPhase = 'LOADING' | 'READY' | 'RECORDING' | 'ANALYZING' | 'RESULTS' | 'COMPREHENSION' | 'SUMMARY';

// ---------- Component ----------
export default function ReadingSessionPage() {
  // Phase management
  const [phase, setPhase] = useState<SessionPhase>('LOADING');
  const [passage, setPassage] = useState<Passage | null>(null);
  const [error, setError] = useState('');

  // Recording state
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const startTimeRef = useRef<number>(0);

  // Analysis state
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  // Comprehension chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [comprehensionScore, setComprehensionScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [chatMode, setChatMode] = useState<'text' | 'voice'>('text');
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceRecRef = useRef<SpeechRecognition | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatModeRef = useRef(chatMode);
  const prevMsgCountRef = useRef(0);

  // Keep ref in sync for use in effects
  useEffect(() => { chatModeRef.current = chatMode; }, [chatMode]);

  // ---------- Text-to-Speech ----------
  const speakText = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    utterance.volume = 1;
    utterance.lang = 'en-US';

    // Try to pick a warm female voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) =>
      /female|samantha|zira|karen|victoria|fiona/i.test(v.name) && v.lang.startsWith('en')
    ) || voices.find((v) => v.lang.startsWith('en') && v.name.includes('Google'));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  // Speak new tutor messages when in voice mode
  useEffect(() => {
    if (chatModeRef.current !== 'voice') {
      prevMsgCountRef.current = chatMessages.length;
      return;
    }
    // Only speak newly added messages
    const newMessages = chatMessages.slice(prevMsgCountRef.current);
    prevMsgCountRef.current = chatMessages.length;

    const tutorMessages = newMessages.filter((m) => m.role === 'tutor');
    if (tutorMessages.length > 0) {
      // Speak the latest tutor message
      speakText(tutorMessages[tutorMessages.length - 1].text);
    }
  }, [chatMessages, speakText]);

  // Summary state
  const [sessionSummary, setSessionSummary] = useState('');
  const [celebrationLevel, setCelebrationLevel] = useState<'star' | 'sparkle' | 'confetti'>('star');

  // ---------- Load Passage ----------
  useEffect(() => {
    async function loadPassage() {
      try {
        const res = await fetch('/api/reading-tutor/next-passage');
        if (res.ok) {
          const data = await res.json();
          setPassage(data.passage);
          setPhase('READY');
        } else {
          setError('Could not load a passage. Please try again later.');
        }
      } catch {
        setError('Could not connect. Please check your internet connection.');
      }
    }
    loadPassage();
  }, []);

  // ---------- Speech Recognition ----------
  const startRecording = useCallback(() => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Your browser does not support speech recognition. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t + ' ';
        } else {
          interim = t;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
      }
    };

    recognition.onend = () => {
      // Only restart if we're still in recording mode
      if (recognitionRef.current) {
        try {
          recognition.start();
        } catch {
          // Ignore restart errors
        }
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    startTimeRef.current = Date.now();
    setIsListening(true);
    setPhase('RECORDING');

    // Start timer
    timerRef.current = setInterval(() => {
      setTimer((t) => t + 1);
    }, 1000);
  }, []);

  const stopRecording = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsListening(false);
    setPhase('ANALYZING');

    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    // Send for analysis
    try {
      const res = await fetch('/api/reading-tutor/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passageId: passage?.id,
          originalText: passage?.text,
          transcript,
          durationSeconds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis);
        setPhase('RESULTS');
      } else {
        setError('Analysis failed. Please try again.');
        setPhase('READY');
      }
    } catch {
      setError('Could not analyze your reading. Please try again.');
      setPhase('READY');
    }
  }, [passage, transcript]);

  // ---------- Comprehension Chat ----------
  const buildFallbackQuestions = useCallback(() => {
    const title = passage?.title || 'the passage';
    return [
      {
        question: `What was "${title}" mostly about? Can you tell me in your own words?`,
        type: 'literal',
        expectedAnswer: 'A summary of the main idea',
        encouragement: "That's okay! Think about the most important thing that happened.",
      },
      {
        question: 'What was your favourite part? Why did you like it?',
        type: 'connection',
        expectedAnswer: 'A personal connection to the text',
        encouragement: "There's no wrong answer here — just tell me what you thought!",
      },
      {
        question: 'Was there anything in the passage that surprised you or that you didn\'t expect?',
        type: 'inference',
        expectedAnswer: 'An observation about something unexpected',
        encouragement: 'Think about what happened — was anything different from what you guessed?',
      },
    ];
  }, [passage]);

  const loadQuestionsIntoChat = useCallback((greeting: string, questions: { question: string; type: string; expectedAnswer: string; encouragement?: string }[]) => {
    setChatMessages([{ role: 'tutor', text: greeting }]);
    if (questions.length > 0) {
      setTotalQuestions(questions.length);
      sessionStorage.setItem('rt-questions', JSON.stringify(questions));
      // Ask first question after greeting
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          { role: 'tutor', text: questions[0].question },
        ]);
      }, 1500);
    }
  }, []);

  const startComprehension = useCallback(async () => {
    setPhase('COMPREHENSION');
    setChatLoading(true);

    try {
      const res = await fetch('/api/reading-tutor/comprehension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passageId: passage?.id,
          passageTitle: passage?.title,
          passageText: passage?.text,
          gradeLevel: passage?.gradeLevel,
          accuracyRate: analysis?.adjustedAccuracy,
          action: 'start',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const greeting = data.greeting || "Nice reading! Let's talk about what you just read. 😊";
        const questions = data.questions?.length > 0 ? data.questions : buildFallbackQuestions();
        loadQuestionsIntoChat(greeting, questions);
      } else {
        // API returned an error — use fallback questions
        console.error('[Comprehension] API returned status', res.status);
        const fallback = buildFallbackQuestions();
        loadQuestionsIntoChat(
          "Great job reading! Let's chat about what you read. 😊",
          fallback,
        );
      }
    } catch (err) {
      console.error('[Comprehension] Network error:', err);
      // Network error — still give them fallback questions
      const fallback = buildFallbackQuestions();
      loadQuestionsIntoChat(
        "Great job reading! Let's chat about what you read. 😊",
        fallback,
      );
    }
    setChatLoading(false);
  }, [passage, analysis, buildFallbackQuestions, loadQuestionsIntoChat]);

  // Core answer submission — used by both text and voice modes
  const submitAnswer = useCallback(async (answer: string) => {
    if (!answer.trim()) return;

    setChatMessages((prev) => [...prev, { role: 'student', text: answer.trim() }]);
    setChatLoading(true);

    const questions = JSON.parse(sessionStorage.getItem('rt-questions') || '[]');
    const currentQuestion = questions[questionIndex];

    // Generate context-aware fallback when AI is unavailable
    const buildOfflineFeedback = (ans: string): { feedback: string; score: number } => {
      const words = ans.trim().split(/\s+/).length;
      const isDontKnow = /i don'?t know|idk|not sure|no idea|i forgot/i.test(ans);
      const isOneWord = words <= 2;
      const isShort = words <= 5;

      if (isDontKnow) {
        const hint = currentQuestion?.encouragement || "Try thinking back to what you read — what do you remember?";
        return { feedback: `That's okay! No pressure. ${hint} 💛`, score: 10 };
      }

      if (isOneWord) {
        return {
          feedback: `Okay! Can you tell me a bit more? Try adding one or two more details to your answer. I bet you know more than you think! 😊`,
          score: 40,
        };
      }

      if (isShort) {
        return {
          feedback: `I like where you're going with that! You're thinking about the right things. Let's move on to the next question. 👍`,
          score: 60,
        };
      }

      // Longer, more detailed answer — give genuine acknowledgment
      return {
        feedback: `Wow, I can tell you were really paying attention! You gave me a lot of detail there, and I love that. Great job! 🌟`,
        score: 75,
      };
    };

    const advanceToNext = (feedback: string) => {
      setChatMessages((prev) => [...prev, { role: 'tutor', text: feedback }]);

      const nextIdx = questionIndex + 1;
      if (nextIdx < questions.length) {
        setQuestionIndex(nextIdx);
        setTimeout(() => {
          setChatMessages((prev) => [
            ...prev,
            { role: 'tutor', text: questions[nextIdx].question },
          ]);
          setChatLoading(false);
        }, 2000);
      } else {
        // All questions done — go to summary
        setChatLoading(false);
        setTimeout(() => {
          finishSession();
        }, 2000);
      }
    };

    try {
      const res = await fetch('/api/reading-tutor/comprehension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate',
          question: currentQuestion?.question,
          questionType: currentQuestion?.type,
          expectedAnswer: currentQuestion?.expectedAnswer,
          studentAnswer: answer.trim(),
          gradeLevel: passage?.gradeLevel,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setComprehensionScore((prev) => prev + (data.score || 0));
        advanceToNext(data.feedback || "Great answer! Let's keep going. 😊");
      } else {
        console.error('[Comprehension] API error', res.status);
        const fallback = buildOfflineFeedback(answer);
        setComprehensionScore((prev) => prev + fallback.score);
        advanceToNext(fallback.feedback);
      }
    } catch (err) {
      console.error('[Comprehension] Network error:', err);
      const fallback = buildOfflineFeedback(answer);
      setComprehensionScore((prev) => prev + fallback.score);
      advanceToNext(fallback.feedback);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIndex, passage]);

  const sendAnswer = useCallback(() => {
    if (!chatInput.trim()) return;
    const answer = chatInput.trim();
    setChatInput('');
    submitAnswer(answer);
  }, [chatInput, submitAnswer]);

  // ---------- Voice Chat ----------
  const startVoiceAnswer = useCallback(() => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setChatMode('text');
      return;
    }

    if (voiceRecRef.current) {
      try { voiceRecRef.current.abort(); } catch { /* ignore */ }
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    let finalText = '';

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += t + ' ';
        } else {
          interim = t;
        }
      }
      setVoiceTranscript(finalText + interim);
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.error('Voice chat error:', event.error);
      }
    };

    rec.onend = () => {
      setVoiceListening(false);
    };

    rec.start();
    voiceRecRef.current = rec;
    setVoiceListening(true);
    setVoiceTranscript('');
  }, []);

  const stopVoiceAnswer = useCallback(() => {
    if (voiceRecRef.current) {
      voiceRecRef.current.stop();
      voiceRecRef.current = null;
    }
    setVoiceListening(false);
    // Submit whatever was captured
    if (voiceTranscript.trim()) {
      submitAnswer(voiceTranscript.trim());
      setVoiceTranscript('');
    }
  }, [voiceTranscript, submitAnswer]);

  // Stop TTS when switching away from voice mode or leaving comprehension
  useEffect(() => {
    if (chatMode !== 'voice' || phase !== 'COMPREHENSION') {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    }
  }, [chatMode, phase]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatLoading]);

  const finishSession = useCallback(async () => {
    setPhase('SUMMARY');

    const avgComprehension =
      totalQuestions > 0 ? Math.round(comprehensionScore / totalQuestions) : 0;

    try {
      const res = await fetch('/api/reading-tutor/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passageId: passage?.id,
          passageTitle: passage?.title,
          accuracyRate: analysis?.adjustedAccuracy,
          wpm: analysis?.wordsPerMinute,
          comprehensionScore: avgComprehension,
          miscues: analysis?.wordResults
            ?.filter((w) => w.status === 'SUBSTITUTION' || w.status === 'OMISSION')
            .map((w) => w.expected) || [],
          transcript,
          durationSeconds: timer,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSessionSummary(data.summary || 'Great job today! Keep reading every day — you are getting stronger! 🌟');
        setCelebrationLevel(data.celebrationLevel || 'star');
      } else {
        setSessionSummary('Great job today! You showed up and that takes courage. See you tomorrow! 🌟');
      }
    } catch {
      setSessionSummary('Awesome work today! Every time you read, your brain gets stronger. See you tomorrow! 💪');
    }
  }, [passage, analysis, comprehensionScore, totalQuestions, transcript, timer]);

  // ---------- Timer Format ----------
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ---------- Render ----------
  if (error) {
    return (
      <div className={styles.tutorRoot}>
        <div className={styles.card}>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>😔</div>
            <h3>Oops!</h3>
            <p>{error}</p>
            <Link href="/student/reading-tutor" className={styles.btnPrimary}>
              ← Back to Reading Tutor
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'LOADING') {
    return (
      <div className={styles.tutorRoot}>
        <div className={styles.sessionLayout}>
          <div className={styles.card}>
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📖</div>
              <h3>Finding you the perfect passage...</h3>
              <p>Mrs. Hammel is picking something just right for you!</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'SUMMARY') {
    const celebEmoji = celebrationLevel === 'confetti' ? '🎉' : celebrationLevel === 'sparkle' ? '✨' : '⭐';

    return (
      <div className={styles.tutorRoot}>
        <div className={styles.sessionLayout}>
          {/* Scores */}
          <div className={styles.scoreSummary}>
            <div className={`${styles.scoreCard} ${styles.accuracy}`}>
              <div className={styles.scoreValue}>{Math.round(analysis?.adjustedAccuracy || 0)}%</div>
              <div className={styles.scoreLabel}>Accuracy</div>
            </div>
            <div className={`${styles.scoreCard} ${styles.speed}`}>
              <div className={styles.scoreValue}>{analysis?.wordsPerMinute || 0}</div>
              <div className={styles.scoreLabel}>Words/Min</div>
            </div>
            <div className={`${styles.scoreCard} ${styles.comprehension}`}>
              <div className={styles.scoreValue}>
                {totalQuestions > 0
                  ? Math.round(comprehensionScore / totalQuestions)
                  : '—'}%
              </div>
              <div className={styles.scoreLabel}>Comprehension</div>
            </div>
          </div>

          {/* Celebration */}
          <div className={styles.card}>
            <div className={styles.celebration}>
              <div className={styles.celebrationEmoji}>{celebEmoji}</div>
              <div className={styles.celebrationText}>Session Complete!</div>
              <div className={styles.celebrationSub}>{sessionSummary}</div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link href="/student/reading-tutor" className={styles.btnPrimary}>
              ← Back to Reading Tutor
            </Link>
            <Link href="/student/reading-tutor/dashboard" className={styles.btnSecondary}>
              📊 View Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tutorRoot}>
      <div className={styles.sessionLayout}>
        {/* Passage Display */}
        <div className={styles.passageCard}>
          <div className={styles.passageTitle}>{passage?.title}</div>
          <div className={styles.passageLevel}>
            Grade {passage?.gradeLevel} · {passage?.lexileLevel}L · {passage?.wordCount} words
          </div>

          <div className={styles.passageText}>
            {phase === 'RESULTS' || phase === 'COMPREHENSION'
              ? // Show color-coded results
                analysis?.wordResults.map((w, i) => (
                  <span
                    key={i}
                    className={
                      w.status === 'CORRECT'
                        ? styles.wordCorrect
                        : w.status === 'SUBSTITUTION'
                          ? styles.wordError
                          : w.status === 'OMISSION'
                            ? styles.wordOmitted
                            : w.status === 'FILTERED'
                              ? styles.wordFiltered
                              : ''
                    }
                    title={
                      w.status === 'SUBSTITUTION'
                        ? `Said "${w.actual}" instead of "${w.expected}"`
                        : w.status === 'OMISSION'
                          ? `Skipped "${w.expected}"`
                          : w.status === 'FILTERED'
                            ? `Speech pattern — not counted as error`
                            : ''
                    }
                  >
                    {w.expected}{' '}
                  </span>
                ))
              : // Show plain text
                passage?.text}
          </div>
        </div>

        {/* Recording Controls */}
        {(phase === 'READY' || phase === 'RECORDING') && (
          <div className={styles.recordArea}>
            {phase === 'RECORDING' && (
              <div className={styles.recordTimer}>{formatTime(timer)}</div>
            )}

            <button
              className={`${styles.recordBtn} ${isListening ? styles.recordBtnActive : ''}`}
              onClick={isListening ? stopRecording : startRecording}
            >
              {isListening ? '⏹' : '🎤'}
            </button>

            <div className={styles.recordLabel}>
              {isListening
                ? 'Reading... tap to stop when done'
                : 'Tap to start reading aloud'}
            </div>

            {phase === 'RECORDING' && transcript && (
              <div className={styles.card} style={{ width: '100%', marginTop: '8px' }}>
                <h3>🎧 What I&apos;m hearing:</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {transcript}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Analyzing */}
        {phase === 'ANALYZING' && (
          <div className={styles.card}>
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🔍</div>
              <h3>Checking your reading...</h3>
              <p>Mrs. Hammel is looking at how you did. Take a breath! 😊</p>
            </div>
          </div>
        )}

        {/* Results + Comprehension Button */}
        {phase === 'RESULTS' && (
          <>
            <div className={styles.scoreSummary}>
              <div className={`${styles.scoreCard} ${styles.accuracy}`}>
                <div className={styles.scoreValue}>
                  {Math.round(analysis?.adjustedAccuracy || 0)}%
                </div>
                <div className={styles.scoreLabel}>Accuracy</div>
              </div>
              <div className={`${styles.scoreCard} ${styles.speed}`}>
                <div className={styles.scoreValue}>{analysis?.wordsPerMinute || 0}</div>
                <div className={styles.scoreLabel}>Words/Min</div>
              </div>
              <div className={`${styles.scoreCard} ${styles.comprehension}`}>
                <div className={styles.scoreValue}>{analysis?.totalWords || 0}</div>
                <div className={styles.scoreLabel}>Total Words</div>
              </div>
            </div>

            {analysis && analysis.filteredMiscues > 0 && (
              <div className={styles.card} style={{ background: '#f0e6ff', border: 'none' }}>
                <p style={{ color: '#7c5ce0', fontSize: '0.85rem', margin: 0 }}>
                  ℹ️ {analysis.filteredMiscues} word(s) matched your voice profile and were not counted as errors.
                </p>
              </div>
            )}

            <div style={{ textAlign: 'center' }}>
              <button onClick={startComprehension} className={styles.btnPrimary}>
                💬 Let&apos;s Talk About What You Read →
              </button>
            </div>
          </>
        )}

        {/* Comprehension Chat */}
        {phase === 'COMPREHENSION' && (
          <div className={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>💬 Mrs. Hammel&apos;s Questions</h3>
              <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '10px', padding: '3px' }}>
                <button
                  onClick={() => setChatMode('text')}
                  style={{
                    padding: '6px 14px', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                    background: chatMode === 'text' ? 'white' : 'transparent',
                    color: chatMode === 'text' ? '#7c5ce0' : '#94a3b8',
                    boxShadow: chatMode === 'text' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  }}
                >⌨️ Type</button>
                <button
                  onClick={() => setChatMode('voice')}
                  style={{
                    padding: '6px 14px', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                    background: chatMode === 'voice' ? 'white' : 'transparent',
                    color: chatMode === 'voice' ? '#7c5ce0' : '#94a3b8',
                    boxShadow: chatMode === 'voice' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  }}
                >🎤 Talk</button>
              </div>
            </div>
            <div className={styles.chatArea} style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`${styles.chatBubble} ${
                    msg.role === 'tutor' ? styles.chatTutor : styles.chatStudent
                  }`}
                >
                  {msg.role === 'tutor' && <strong style={{ fontSize: '0.8rem' }}>Mrs. Hammel: </strong>}
                  {msg.text}
                </div>
              ))}

              {chatLoading && (
                <div className={`${styles.chatBubble} ${styles.chatTutor}`} style={{ opacity: 0.6 }}>
                  Mrs. Hammel is thinking... 💭
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Text input mode */}
            {!chatLoading && questionIndex < totalQuestions && chatMode === 'text' && (
              <div className={styles.chatInput}>
                <input
                  type="text"
                  placeholder="Type your answer..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendAnswer()}
                />
                <button onClick={sendAnswer}>Send</button>
              </div>
            )}

            {/* Voice input mode */}
            {!chatLoading && questionIndex < totalQuestions && chatMode === 'voice' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                {isSpeaking && (
                  <div style={{ fontSize: '0.85rem', color: '#7c5ce0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ animation: 'pulse 1.5s ease-in-out infinite', display: 'inline-block' }}>🔊</span>
                    Mrs. Hammel is talking...
                  </div>
                )}
                {voiceTranscript && (
                  <div style={{ fontSize: '0.9rem', color: '#475569', background: '#f8fafc', padding: '10px 16px', borderRadius: '10px', width: '100%', minHeight: '40px' }}>
                    {voiceTranscript}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button
                    onClick={voiceListening ? stopVoiceAnswer : startVoiceAnswer}
                    disabled={isSpeaking}
                    style={{
                      width: '56px', height: '56px', borderRadius: '50%', border: 'none', cursor: isSpeaking ? 'not-allowed' : 'pointer',
                      background: isSpeaking ? '#cbd5e1' : voiceListening ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #7c5ce0, #a78bfa)',
                      color: 'white', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: voiceListening ? '0 0 0 4px rgba(239,68,68,0.2)' : '0 2px 8px rgba(124,92,224,0.3)',
                      animation: voiceListening ? 'pulse 1.5s ease-in-out infinite' : 'none',
                      opacity: isSpeaking ? 0.5 : 1,
                    }}
                  >
                    {voiceListening ? '⏹' : '🎤'}
                  </button>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    {isSpeaking ? 'Wait for Mrs. Hammel to finish...' : voiceListening ? 'Listening... tap to send' : 'Tap to answer'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

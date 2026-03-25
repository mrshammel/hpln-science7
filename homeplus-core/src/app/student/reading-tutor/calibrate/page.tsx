'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import styles from '../reading-tutor.module.css';

// ---------- Calibration Words ----------
const REPEAT_WORDS = [
  'think', 'ship', 'chair', 'rain', 'light',
  'three', 'the', 'said', 'because', 'friend',
  'water', 'little', 'read', 'school', 'brother',
];

// ---------- Types ----------
type CalibrationStep = 'WELCOME' | 'FREE_TALK' | 'REPEAT' | 'KNOWN_WORDS' | 'ANALYZING' | 'DONE';

export default function CalibratePage() {
  const [step, setStep] = useState<CalibrationStep>('WELCOME');
  const [freeTalkTranscript, setFreeTalkTranscript] = useState('');
  const [repeatResults, setRepeatResults] = useState<{ target: string; heard: string }[]>([]);
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [patternsFound, setPatternsFound] = useState(0);
  const [error, setError] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // ---------- Speech Helpers ----------
  const gotResultRef = useRef(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 2;

  const startListening = useCallback((
    onResult: (text: string) => void,
    { onEndWithoutResult, continuous = true }: { onEndWithoutResult?: () => void; continuous?: boolean } = {},
  ) => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Your browser does not support speech recognition. Please use Chrome or Edge.');
      return;
    }

    // clean up any previous session
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;

    gotResultRef.current = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      gotResultRef.current = true;
      const text = event.results[event.results.length - 1][0].transcript;
      onResult(text.trim());
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.error('Speech error:', event.error);
      }
    };

    recognition.onend = () => {
      // If the session ended without a result, handle it
      if (!gotResultRef.current && onEndWithoutResult) {
        onEndWithoutResult();
      }
      // Always reset listening state when recognition truly ends
      if (recognitionRef.current === recognition) {
        setIsListening(false);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // ---------- Step Handlers ----------
  const startFreeTalk = () => {
    setStep('FREE_TALK');
    let fullTranscript = '';
    startListening((text) => {
      fullTranscript += text + ' ';
      setFreeTalkTranscript(fullTranscript.trim());
    });
  };

  const finishFreeTalk = () => {
    stopListening();
    setStep('REPEAT');
  };

  const [repeatHint, setRepeatHint] = useState('');

  const startRepeatWord = () => {
    const word = REPEAT_WORDS[currentWordIdx];
    setRepeatHint('');
    retryCountRef.current = 0;

    const attemptListen = () => {
      startListening(
        (text) => {
          // Got a result — record it and advance
          stopListening();
          setRepeatHint('');
          retryCountRef.current = 0;
          setRepeatResults((prev) => [...prev, { target: word, heard: text.toLowerCase() }]);

          if (currentWordIdx + 1 < REPEAT_WORDS.length) {
            setCurrentWordIdx((i) => i + 1);
          } else {
            finishCalibration();
          }
        },
        {
          continuous: true,
          onEndWithoutResult: () => {
            // Auto-retry a couple times, then show a hint
            if (retryCountRef.current < MAX_RETRIES) {
              retryCountRef.current++;
              setRepeatHint('I didn\'t catch that — try again!');
              setTimeout(attemptListen, 400);
            } else {
              setRepeatHint('Tap the microphone and say the word clearly.');
              setIsListening(false);
            }
          },
        },
      );
    };

    attemptListen();
  };

  const finishCalibration = async () => {
    setStep('ANALYZING');
    stopListening();

    try {
      const res = await fetch('/api/reading-tutor/calibrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freeResponse: freeTalkTranscript,
          repeatResults: [...repeatResults],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPatternsFound(data.patternsFound || 0);
        setStep('DONE');
      } else {
        setError('Calibration failed. Please try again.');
      }
    } catch {
      setError('Could not save your voice profile. Please try again.');
    }
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
            <button onClick={() => { setError(''); setStep('WELCOME'); }} className={styles.btnPrimary}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tutorRoot}>
      <div className={styles.sessionLayout}>
        {/* Progress Dots */}
        <div className={styles.stepProgress}>
          {['WELCOME', 'FREE_TALK', 'REPEAT', 'DONE'].map((s, i) => (
            <span key={s}>
              <span
                className={`${styles.stepDot} ${
                  step === s ? styles.stepDotActive : ['WELCOME', 'FREE_TALK', 'REPEAT', 'DONE'].indexOf(step) > i ? styles.stepDotDone : ''
                }`}
              />
              {i < 3 && <span className={styles.stepLine} />}
            </span>
          ))}
        </div>

        {/* WELCOME */}
        {step === 'WELCOME' && (
          <div className={styles.calibrationStep}>
            <h3>👋 Get to Know My Voice</h3>
            <p>
              Hi there! Before we start reading together, I want to learn what YOUR voice sounds like.
              This helps me understand you better — kind of like how a teacher learns to hear each student.
            </p>
            <p>
              This will only take about 2 minutes. There are no wrong answers — just be yourself! 😊
            </p>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              You&apos;ll need to allow microphone access when your browser asks.
            </p>
            <button onClick={startFreeTalk} className={styles.btnPrimary}>
              🎤 Let&apos;s Start!
            </button>
          </div>
        )}

        {/* FREE TALK */}
        {step === 'FREE_TALK' && (
          <div className={styles.calibrationStep}>
            <h3>🗣️ Step 1: Tell Me About You!</h3>
            <p>
              Tell me about your favourite animal, your favourite thing to do after school,
              or what you had for breakfast. Anything at all — I just want to hear your voice!
            </p>

            <div className={styles.recordArea}>
              <button
                className={`${styles.recordBtn} ${isListening ? styles.recordBtnActive : ''}`}
                onClick={isListening ? finishFreeTalk : startFreeTalk}
              >
                {isListening ? '⏹' : '🎤'}
              </button>
              <div className={styles.recordLabel}>
                {isListening ? 'I&apos;m listening... talk as long as you want!' : 'Tap to start talking'}
              </div>
            </div>

            {freeTalkTranscript && (
              <div className={styles.card}>
                <h3>🎧 What I heard:</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{freeTalkTranscript}</p>
              </div>
            )}

            {freeTalkTranscript.split(' ').length > 5 && (
              <button onClick={finishFreeTalk} className={styles.btnPrimary} style={{ marginTop: '12px' }}>
                Done talking → Next Step
              </button>
            )}
          </div>
        )}

        {/* REPEAT AFTER ME */}
        {step === 'REPEAT' && (
          <div className={styles.calibrationStep}>
            <h3>🔁 Step 2: Repeat After Me</h3>
            <p>Say each word out loud. Take your time!</p>

            <div className={styles.wordGrid}>
              {REPEAT_WORDS.map((word, i) => (
                <span
                  key={word}
                  className={`${styles.wordChip} ${
                    i < currentWordIdx
                      ? styles.wordChipDone
                      : i === currentWordIdx
                        ? styles.wordChipActive
                        : ''
                  }`}
                >
                  {word}
                </span>
              ))}
            </div>

            <div className={styles.recordArea}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#7c5ce0', marginBottom: '8px' }}>
                &ldquo;{REPEAT_WORDS[currentWordIdx]}&rdquo;
              </div>

              <button
                className={`${styles.recordBtn} ${isListening ? styles.recordBtnActive : ''}`}
                onClick={isListening ? stopListening : startRepeatWord}
              >
                {isListening ? '⏹' : '🎤'}
              </button>
              <div className={styles.recordLabel}>
                {isListening ? 'Listening...' : `Say "${REPEAT_WORDS[currentWordIdx]}"`}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Word {currentWordIdx + 1} of {REPEAT_WORDS.length}
              </div>
              {repeatHint && (
                <div style={{ fontSize: '0.85rem', color: '#f59e0b', marginTop: '8px', fontWeight: 500 }}>
                  {repeatHint}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ANALYZING */}
        {step === 'ANALYZING' && (
          <div className={styles.calibrationStep}>
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🔍</div>
              <h3>Learning your voice...</h3>
              <p>Mrs. Hammel is getting to know how you sound. Just a moment!</p>
            </div>
          </div>
        )}

        {/* DONE */}
        {step === 'DONE' && (
          <div className={styles.calibrationStep}>
            <div className={styles.celebration}>
              <div className={styles.celebrationEmoji}>🎉</div>
              <div className={styles.celebrationText}>Voice Setup Complete!</div>
              <div className={styles.celebrationSub}>
                {patternsFound > 0
                  ? `I noticed ${patternsFound} speech pattern${patternsFound > 1 ? 's' : ''} that I'll remember — this way I won't count them as reading mistakes. You got this! 💪`
                  : "Your voice came through loud and clear! I'm all set to listen to you read. Let's go! 📖"}
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
                <Link href="/student/reading-tutor/session" className={styles.btnPrimary}>
                  ▶ Start Reading!
                </Link>
                <Link href="/student/reading-tutor" className={styles.btnSecondary}>
                  ← Back
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

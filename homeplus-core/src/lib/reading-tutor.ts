// ============================================
// AI Reading Tutor — Core Analysis Engine
// ============================================
// Handles transcript analysis, accuracy scoring, miscue detection,
// voice profile filtering, and Lexile estimation.

// ---------- Types ----------

export interface Miscue {
  position: number;
  expected: string;
  actual: string;
  type: 'SUBSTITUTION' | 'OMISSION' | 'INSERTION' | 'SELF_CORRECTION';
  isFiltered: boolean; // true if matched voice profile pattern
}

export interface TranscriptAnalysis {
  totalWords: number;
  correctWords: number;
  miscues: Miscue[];
  filteredMiscues: number; // miscues excluded due to voice profile
  rawAccuracy: number; // before voice profile filter (0-100)
  adjustedAccuracy: number; // after voice profile filter (0-100)
  wordsPerMinute: number;
  wordResults: WordResult[];
}

export interface WordResult {
  position: number;
  expected: string;
  actual: string | null;
  status: 'CORRECT' | 'SUBSTITUTION' | 'OMISSION' | 'INSERTION' | 'FILTERED';
}

export interface SpeechPattern {
  target: string; // the expected sound/word
  actual: string; // what student consistently produces
  examples: string[];
}

export interface VoiceProfileData {
  speechPatterns: SpeechPattern[];
  calibrationWords: { word: string; heard: string }[];
  isCalibrated: boolean;
}

// ---------- Transcript Analysis ----------

/**
 * Compare the original passage text to the speech-to-text transcript.
 * Returns word-by-word analysis with miscue detection.
 */
export function analyzeTranscript(
  originalText: string,
  transcript: string,
  voiceProfile: VoiceProfileData | null,
  durationSeconds: number
): TranscriptAnalysis {
  const expectedWords = normalizeText(originalText);
  const spokenWords = normalizeText(transcript);

  const wordResults: WordResult[] = [];
  const miscues: Miscue[] = [];

  // Use Levenshtein-based alignment for word sequences
  const alignment = alignWords(expectedWords, spokenWords);

  let correctCount = 0;
  let filteredCount = 0;

  for (let i = 0; i < alignment.length; i++) {
    const { expected, actual, type } = alignment[i];

    if (type === 'MATCH') {
      wordResults.push({
        position: i,
        expected,
        actual,
        status: 'CORRECT',
      });
      correctCount++;
    } else if (type === 'SUBSTITUTION') {
      // Check if this substitution matches a voice profile pattern
      const isFilteredByProfile = voiceProfile
        ? isVoiceProfileMatch(expected, actual ?? '', voiceProfile)
        : false;

      if (isFilteredByProfile) {
        wordResults.push({
          position: i,
          expected,
          actual,
          status: 'FILTERED',
        });
        correctCount++; // count as correct since it's a speech pattern, not a reading error
        filteredCount++;
        miscues.push({
          position: i,
          expected,
          actual: actual ?? '',
          type: 'SUBSTITUTION',
          isFiltered: true,
        });
      } else {
        wordResults.push({
          position: i,
          expected,
          actual,
          status: 'SUBSTITUTION',
        });
        miscues.push({
          position: i,
          expected,
          actual: actual ?? '',
          type: 'SUBSTITUTION',
          isFiltered: false,
        });
      }
    } else if (type === 'OMISSION') {
      wordResults.push({
        position: i,
        expected,
        actual: null,
        status: 'OMISSION',
      });
      miscues.push({
        position: i,
        expected,
        actual: '',
        type: 'OMISSION',
        isFiltered: false,
      });
    } else if (type === 'INSERTION') {
      // Student said extra words — note but don't penalize heavily
      miscues.push({
        position: i,
        expected: '',
        actual: actual ?? '',
        type: 'INSERTION',
        isFiltered: false,
      });
    }
  }

  const totalWords = expectedWords.length;
  const rawCorrect = alignment.filter((a) => a.type === 'MATCH').length;
  const rawAccuracy = totalWords > 0 ? (rawCorrect / totalWords) * 100 : 0;
  const adjustedAccuracy =
    totalWords > 0 ? (correctCount / totalWords) * 100 : 0;

  const wordsPerMinute =
    durationSeconds > 0
      ? Math.round((spokenWords.length / durationSeconds) * 60)
      : 0;

  return {
    totalWords,
    correctWords: correctCount,
    miscues: miscues.filter((m) => !m.isFiltered),
    filteredMiscues: filteredCount,
    rawAccuracy: Math.round(rawAccuracy * 10) / 10,
    adjustedAccuracy: Math.round(adjustedAccuracy * 10) / 10,
    wordsPerMinute,
    wordResults,
  };
}

// ---------- Voice Profile Matching ----------

/**
 * Check if a substitution matches a known speech pattern.
 * e.g., student always says "fink" for "think" → /θ/ → /f/ pattern
 */
function isVoiceProfileMatch(
  expected: string,
  actual: string,
  profile: VoiceProfileData
): boolean {
  if (!profile.isCalibrated || !profile.speechPatterns.length) return false;

  for (const pattern of profile.speechPatterns) {
    // Check if the expected word contains the target sound and the actual
    // word contains the substitution sound, matching the known pattern.
    // Simple heuristic: check if the calibration words show the same mapping.
    for (const example of pattern.examples) {
      const [exWord, acWord] = example.split('→').map((s) => s.trim().toLowerCase());
      if (expected === exWord && actual === acWord) {
        return true;
      }
    }

    // Also check if the substitution follows the same character pattern
    // e.g., "th" → "f" in any word
    if (
      pattern.target.length <= 3 &&
      expected.includes(pattern.target) &&
      actual === expected.replace(pattern.target, pattern.actual)
    ) {
      return true;
    }
  }

  return false;
}

// ---------- Lexile Estimation ----------

/**
 * Estimate a Lexile level based on accuracy on a passage of known difficulty.
 * Uses the principle: if accuracy is 95%+, the text is at instructional level.
 * If 90-94%, it's challenging. Below 90%, it's frustration level.
 */
export function estimateLexile(
  accuracyRate: number,
  passageLexile: number,
  comprehensionScore: number
): number {
  // Base estimation from passage level
  let estimate = passageLexile;

  // If very high accuracy + comprehension, student is above this level
  if (accuracyRate >= 98 && comprehensionScore >= 80) {
    estimate = passageLexile + 100;
  } else if (accuracyRate >= 95 && comprehensionScore >= 70) {
    estimate = passageLexile + 50;
  } else if (accuracyRate >= 90 && comprehensionScore >= 60) {
    estimate = passageLexile; // at level
  } else if (accuracyRate >= 85) {
    estimate = passageLexile - 50;
  } else {
    estimate = passageLexile - 100;
  }

  // Clamp to reasonable range
  return Math.max(100, Math.min(1200, estimate));
}

/**
 * Select the next passage based on performance history.
 * Uses Science of Reading instructional level thresholds:
 * - Independent level: 95%+ accuracy (student can read alone)
 * - Instructional level: 90-94% accuracy (sweet spot for learning)
 * - Frustration level: below 90% accuracy (too hard — step down)
 *
 * UFLI principle: always keep students in the instructional zone.
 * If they're in frustration, step DOWN significantly to rebuild confidence.
 */
export function selectNextPassageLevel(
  recentSessions: { accuracyRate: number; comprehensionScore: number; passageLexile: number }[]
): { targetLexile: number; targetGrade: number } {
  if (recentSessions.length === 0) {
    // First session: start very easy (Pre-primer, ~Lexile 100) to build confidence
    return { targetLexile: 100, targetGrade: 1 };
  }

  const last = recentSessions[0];
  const avgAccuracy =
    recentSessions.reduce((sum, s) => sum + s.accuracyRate, 0) /
    recentSessions.length;
  const avgComprehension =
    recentSessions.reduce((sum, s) => sum + s.comprehensionScore, 0) /
    recentSessions.length;

  let targetLexile = last.passageLexile;

  // ——— SoR-aligned leveling decisions ———

  if (avgAccuracy >= 97 && avgComprehension >= 80 && recentSessions.length >= 2) {
    // Well above independent level — move up confidently
    targetLexile = last.passageLexile + 75;
  } else if (avgAccuracy >= 95 && avgComprehension >= 70) {
    // At independent level — nudge up slightly
    targetLexile = last.passageLexile + 40;
  } else if (avgAccuracy >= 90 && avgComprehension >= 60) {
    // Instructional level — this is the sweet spot, stay or move up slightly
    targetLexile = last.passageLexile + 15;
  } else if (avgAccuracy >= 85) {
    // Approaching frustration — step back to rebuild
    targetLexile = last.passageLexile - 50;
  } else if (avgAccuracy >= 70) {
    // Frustration level — significant step down needed
    targetLexile = last.passageLexile - 100;
  } else {
    // Deep frustration (below 70%) — major step down, this passage was way too hard
    targetLexile = last.passageLexile - 150;
  }

  // Floor at Lexile 50 (pre-primer decodable text), ceiling at 900
  targetLexile = Math.max(50, Math.min(900, targetLexile));

  // Map Lexile to approximate grade level (SoR-aligned ranges)
  const targetGrade =
    targetLexile <= 100
      ? 1
      : targetLexile <= 250
        ? 1
        : targetLexile <= 400
          ? 2
          : targetLexile <= 550
            ? 3
            : targetLexile <= 700
              ? 4
              : targetLexile <= 850
                ? 5
                : 6;

  return { targetLexile, targetGrade };
}

// ---------- Helpers ----------

/** Common speech-to-text equivalences (homophones, contractions, short forms) */
const EQUIVALENCE_GROUPS: string[][] = [
  ['to', 'too', 'two', '2'],
  ['for', 'four', '4'],
  ['a', 'uh', 'ah'],
  ['the', 'da', 'duh', 'thuh'],
  ['and', 'an', 'n', "'n"],
  ['red', 'read'],
  ['new', 'knew'],
  ['there', 'their', "they're"],
  ['your', "you're", 'ur'],
  ['its', "it's"],
  ['one', 'won', '1'],
  ['right', 'write'],
  ['no', 'know'],
  ['hear', 'here'],
  ['see', 'sea'],
  ['would', 'wood'],
  ['sun', 'son'],
  ['I', 'eye'],
  ['be', 'bee'],
  ['ate', 'eight', '8'],
  ['him', "'im"],
  ['them', "'em"],
  ['going', "goin'", 'goin'],
  ['because', "'cause", 'cuz', 'cause'],
  ['want', 'wanna'],
  ['going to', 'gonna'],
  ['got to', 'gotta'],
  ['is not', "isn't"],
  ['do not', "don't"],
  ['can not', "can't"],
  ['he is', "he's"],
  ['she is', "she's"],
  ['it is', "it's"],
  ['like', 'likes'],  // common inflection difference
];

/** Build a quick-lookup map from each word -> its equivalence group */
const equivalenceMap: Map<string, Set<string>> = new Map();
for (const group of EQUIVALENCE_GROUPS) {
  const groupSet = new Set(group.map((w) => w.toLowerCase()));
  for (const word of group) {
    const existing = equivalenceMap.get(word.toLowerCase());
    if (existing) {
      for (const w of groupSet) existing.add(w);
    } else {
      equivalenceMap.set(word.toLowerCase(), new Set(groupSet));
    }
  }
}

/** Filler / hesitation words that speech recognition picks up but aren't real words */
const FILLER_WORDS = new Set([
  'um', 'uh', 'umm', 'uhh', 'hmm', 'hm', 'er', 'ah', 'oh',
  'okay', 'ok', 'like', 'so', 'well', 'yeah', 'yep',
]);

/** Normalize text to lowercase words array, stripping punctuation */
function normalizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, '') // keep apostrophes for contractions
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/** Remove filler words from spoken transcript */
function removeFillers(words: string[]): string[] {
  return words.filter((w) => !FILLER_WORDS.has(w));
}

/** Levenshtein edit distance between two strings */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Check if two words should be considered a "match" for reading accuracy.
 * Uses homophones, edit distance, and prefix/suffix tolerance.
 */
function wordsMatch(expected: string, actual: string): boolean {
  if (expected === actual) return true;

  // Check homophones / equivalence
  const eqGroup = equivalenceMap.get(expected);
  if (eqGroup && eqGroup.has(actual)) return true;

  // Check if one is a simple inflection of the other (e.g., "ride"/"rides", "go"/"goes")
  if (expected.startsWith(actual) || actual.startsWith(expected)) {
    const diff = Math.abs(expected.length - actual.length);
    if (diff <= 2) return true; // covers -s, -es, -ed, -ly (short suffix)
  }

  // Edit distance tolerance — allows for speech recognition mishearings
  const maxLen = Math.max(expected.length, actual.length);
  const dist = editDistance(expected, actual);

  if (maxLen <= 3) {
    return dist <= 1; // short words: allow 1 edit (e.g., "a"/"ah", "it"/"is" etc.)
  } else if (maxLen <= 6) {
    return dist <= 1; // medium words: allow 1 edit
  } else {
    return dist <= 2; // long words: allow 2 edits
  }
}

interface AlignedWord {
  expected: string;
  actual: string | null;
  type: 'MATCH' | 'SUBSTITUTION' | 'OMISSION' | 'INSERTION';
}

/**
 * DP-based (Needleman-Wunsch style) word-sequence alignment.
 * Aligns expected passage words to spoken transcript words using
 * fuzzy word matching and optimal global alignment to avoid
 * cascading misalignment from early mismatches.
 */
function alignWords(expected: string[], rawSpoken: string[]): AlignedWord[] {
  const spoken = removeFillers(rawSpoken);

  const n = expected.length;
  const m = spoken.length;

  // Scoring
  const MATCH_SCORE = 0;
  const MISMATCH_SCORE = 2; // cost of substitution
  const GAP_SCORE = 1;      // cost of omission or insertion

  // DP table
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  // Direction tracking: 0 = diag, 1 = up (omission), 2 = left (insertion)
  const trace: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  // Initialize
  for (let i = 1; i <= n; i++) {
    dp[i][0] = i * GAP_SCORE;
    trace[i][0] = 1;
  }
  for (let j = 1; j <= m; j++) {
    dp[0][j] = j * GAP_SCORE;
    trace[0][j] = 2;
  }

  // Fill DP table
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const isMatch = wordsMatch(expected[i - 1], spoken[j - 1]);
      const diagCost = dp[i - 1][j - 1] + (isMatch ? MATCH_SCORE : MISMATCH_SCORE);
      const upCost = dp[i - 1][j] + GAP_SCORE;
      const leftCost = dp[i][j - 1] + GAP_SCORE;

      if (diagCost <= upCost && diagCost <= leftCost) {
        dp[i][j] = diagCost;
        trace[i][j] = 0;
      } else if (upCost <= leftCost) {
        dp[i][j] = upCost;
        trace[i][j] = 1;
      } else {
        dp[i][j] = leftCost;
        trace[i][j] = 2;
      }
    }
  }

  // Traceback
  const result: AlignedWord[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && trace[i][j] === 0) {
      const isMatch = wordsMatch(expected[i - 1], spoken[j - 1]);
      result.push({
        expected: expected[i - 1],
        actual: spoken[j - 1],
        type: isMatch ? 'MATCH' : 'SUBSTITUTION',
      });
      i--;
      j--;
    } else if (i > 0 && trace[i][j] === 1) {
      result.push({
        expected: expected[i - 1],
        actual: null,
        type: 'OMISSION',
      });
      i--;
    } else {
      result.push({
        expected: '',
        actual: spoken[j - 1],
        type: 'INSERTION',
      });
      j--;
    }
  }

  result.reverse();
  return result;
}


// ============================================
// Lesson Progress Helpers — Home Plus LMS
// ============================================
// Centralised progression logic consumed by:
//   - unit-detail-data  (lesson gating + unit rollup)
//   - course-detail-data  (course rollup)
//   - student-data  (dashboard rollup)
//
// Subject-aware unlock rules:
//   SCIENCE  — previous must be MASTERED
//   MATH     — previous must be COMPLETE or MASTERED
//   ELA      — previous must be COMPLETE or MASTERED
//   SOCIAL   — previous must be COMPLETE or MASTERED
//   GENERAL  — previous must be COMPLETE or MASTERED

import type { SubjectMode } from './lesson-types';

// ---------- Persisted status (matches Prisma ProgressStatus) ----------
export type PersistedStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETE'
  | 'MASTERED'
  | 'NEEDS_RETEACH';

// ---------- Display status (UI-only; adds LOCKED + AVAILABLE) ----------
export type LessonDisplayState =
  | 'LOCKED'
  | 'AVAILABLE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'MASTERED'
  | 'NEEDS_RETEACH';

// ---------- A. isLessonDone ----------
/**
 * Returns true when a lesson counts as "done" for progress rollup:
 * only COMPLETE and MASTERED.  NEEDS_RETEACH is explicitly excluded.
 */
export function isLessonDone(status: string | null | undefined): boolean {
  return status === 'COMPLETE' || status === 'MASTERED';
}

// ---------- B. isLessonUnlocked ----------
/**
 * Given the *previous* lesson's persisted status and the course subject
 * mode, determines whether the *next* lesson should be unlocked.
 *
 * The first lesson in a unit is always unlocked (`prevStatus` should be
 * passed as `null` for lesson index 0).
 */
export function isLessonUnlocked(
  prevStatus: string | null | undefined,
  subjectMode: SubjectMode,
): boolean {
  // First lesson (no predecessor) → always unlocked
  if (prevStatus === null || prevStatus === undefined) return true;

  switch (subjectMode) {
    case 'SCIENCE':
      // Science requires strict mastery — COMPLETE alone is insufficient
      return prevStatus === 'MASTERED';

    case 'MATH':
    case 'ELA':
    case 'SOCIAL_STUDIES':
    case 'GENERAL':
    default:
      // These subjects accept either COMPLETE or MASTERED
      return prevStatus === 'COMPLETE' || prevStatus === 'MASTERED';
  }
}

// ---------- C. getLessonDisplayState ----------
/**
 * Translates a persisted DB status + computed unlock flag into a UI
 * display state suitable for student-facing badges and CTAs.
 */
export function getLessonDisplayState(
  status: string | null | undefined,
  isUnlocked: boolean,
): LessonDisplayState {
  // If not unlocked and has no meaningful status, it's locked
  if (!isUnlocked) {
    // Edge case: lesson could have IN_PROGRESS or NEEDS_RETEACH status
    // from a previous attempt — still show real status so students can
    // return to it.
    if (status === 'IN_PROGRESS') return 'IN_PROGRESS';
    if (status === 'NEEDS_RETEACH') return 'NEEDS_RETEACH';
    if (status === 'COMPLETE') return 'COMPLETED';
    if (status === 'MASTERED') return 'MASTERED';
    return 'LOCKED';
  }

  switch (status) {
    case 'MASTERED':
      return 'MASTERED';
    case 'COMPLETE':
      return 'COMPLETED';
    case 'NEEDS_RETEACH':
      return 'NEEDS_RETEACH';
    case 'IN_PROGRESS':
      return 'IN_PROGRESS';
    default:
      return 'AVAILABLE';
  }
}

// ---------- D. resolveNextLesson ----------
/**
 * Given an ordered array of lessons with display states, returns the ID
 * of the recommended next lesson.
 *
 * Priority:
 *   1. NEEDS_RETEACH  (student must fix before progressing)
 *   2. IN_PROGRESS    (student already started)
 *   3. AVAILABLE      (first untouched open lesson)
 *
 * Never selects LOCKED, COMPLETED, or MASTERED.
 */
export interface LessonForResolver {
  id: string;
  title: string;
  displayState: LessonDisplayState;
}

export function resolveNextLesson(
  lessons: LessonForResolver[],
): { id: string; title: string } | null {
  // 1. Reteach needed?
  const reteach = lessons.find((l) => l.displayState === 'NEEDS_RETEACH');
  if (reteach) return { id: reteach.id, title: reteach.title };

  // 2. In progress?
  const inProgress = lessons.find((l) => l.displayState === 'IN_PROGRESS');
  if (inProgress) return { id: inProgress.id, title: inProgress.title };

  // 3. First available
  const available = lessons.find((l) => l.displayState === 'AVAILABLE');
  if (available) return { id: available.id, title: available.title };

  return null;
}

// ---------- UI Metadata ----------
/**
 * Returns color / badge / CTA text for a given display state.
 * Used by both the unit page and potentially course-unit cards.
 */
export interface LessonStateUI {
  badge: string;
  color: string;
  bg: string;
  cta: string;
  clickable: boolean;
}

export function getLessonStateUI(state: LessonDisplayState): LessonStateUI {
  switch (state) {
    case 'LOCKED':
      return { badge: '🔒 Locked', color: '#94a3b8', bg: '#f8fafc', cta: '', clickable: false };
    case 'AVAILABLE':
      return { badge: '▶️ Ready', color: '#2563eb', bg: '#eff6ff', cta: 'Start Lesson →', clickable: true };
    case 'IN_PROGRESS':
      return { badge: '📝 In Progress', color: '#2563eb', bg: '#eff6ff', cta: 'Continue →', clickable: true };
    case 'NEEDS_RETEACH':
      return { badge: '🔄 Review Needed', color: '#d97706', bg: '#fffbeb', cta: 'Complete Review →', clickable: true };
    case 'COMPLETED':
      return { badge: '✅ Complete', color: '#059669', bg: '#f0fdf4', cta: 'Review', clickable: true };
    case 'MASTERED':
      return { badge: '⭐ Mastered', color: '#059669', bg: '#f0fdf4', cta: 'Review', clickable: true };
    default:
      return { badge: '⬜ Not Started', color: '#94a3b8', bg: '#ffffff', cta: 'Start Lesson', clickable: true };
  }
}

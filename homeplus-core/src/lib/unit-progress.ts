// ============================================
// Unit Progress Helpers — Home Plus LMS
// ============================================
// Centralised unit-level gating logic consumed by:
//   - course-detail-data  (student course page)
//   - student-data        (dashboard rollups)
//
// Two layers of truth:
//   LAYER 1 — Default sequential gating from lesson progress
//   LAYER 2 — Teacher override (UNLOCKED / COMPLETED / EXEMPT)

import type { SubjectMode } from './lesson-types';

// ---------- Override state (matches Prisma UnitOverrideState) ----------
export type UnitOverrideState = 'NONE' | 'UNLOCKED' | 'COMPLETED' | 'EXEMPT';

// ---------- Display state (student-facing) ----------
export type UnitDisplayState =
  | 'LOCKED'
  | 'AVAILABLE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'EXEMPT';

// ---------- A. isUnitSatisfied ----------
/**
 * Returns true when a unit counts as "satisfied" for unlocking the
 * subsequent unit.  Satisfied means:
 *   - unit progress shows completed (all lessons done/mastered)
 *   - OR override is COMPLETED
 *   - OR override is EXEMPT
 *
 * UNLOCKED alone does NOT mean satisfied — it just means the student
 * can enter, not that they've finished.
 */
export function isUnitSatisfied(
  unitStatus: 'not-started' | 'in-progress' | 'completed',
  overrideState: UnitOverrideState | null | undefined,
): boolean {
  if (overrideState === 'COMPLETED' || overrideState === 'EXEMPT') return true;
  return unitStatus === 'completed';
}

// ---------- B. isUnitUnlocked ----------
/**
 * Determines whether a unit is accessible to the student.
 *
 * Rules:
 *   - first unit is always unlocked
 *   - otherwise, previous unit must be satisfied
 *   - override UNLOCKED / COMPLETED / EXEMPT makes the unit accessible
 *     regardless of default gating
 */
export function isUnitUnlocked(
  prevSatisfied: boolean,
  overrideState: UnitOverrideState | null | undefined,
  isFirstUnit: boolean,
): boolean {
  // Any meaningful override opens the unit
  if (
    overrideState === 'UNLOCKED' ||
    overrideState === 'COMPLETED' ||
    overrideState === 'EXEMPT'
  ) {
    return true;
  }

  // First unit is always open
  if (isFirstUnit) return true;

  // Default: previous unit must be satisfied
  return prevSatisfied;
}

// ---------- C. getUnitDisplayState ----------
/**
 * Maps unit progress status + unlock state + override into a
 * student-facing display state.
 */
export function getUnitDisplayState(
  unitStatus: 'not-started' | 'in-progress' | 'completed',
  isUnlocked: boolean,
  overrideState: UnitOverrideState | null | undefined,
): UnitDisplayState {
  // Override COMPLETED / EXEMPT always shows as satisfied
  if (overrideState === 'COMPLETED') return 'COMPLETED';
  if (overrideState === 'EXEMPT') return 'EXEMPT';

  // Not unlocked → locked
  if (!isUnlocked) return 'LOCKED';

  // Normal progress states
  if (unitStatus === 'completed') return 'COMPLETED';
  if (unitStatus === 'in-progress') return 'IN_PROGRESS';
  return 'AVAILABLE';
}

// ---------- D. resolveNextUnit ----------
/**
 * Finds the recommended next unit for a student.
 * Priority:
 *   1. first IN_PROGRESS unit
 *   2. first AVAILABLE unit
 *   Never returns LOCKED, COMPLETED, or EXEMPT.
 */
export interface UnitForResolver {
  id: string;
  title: string;
  displayState: UnitDisplayState;
}

export function resolveNextUnit(
  units: UnitForResolver[],
): { id: string; title: string } | null {
  const inProgress = units.find((u) => u.displayState === 'IN_PROGRESS');
  if (inProgress) return { id: inProgress.id, title: inProgress.title };

  const available = units.find((u) => u.displayState === 'AVAILABLE');
  if (available) return { id: available.id, title: available.title };

  return null;
}

// ---------- UI Metadata ----------
export interface UnitStateUI {
  badge: string;
  color: string;
  bg: string;
  cta: string;
  clickable: boolean;
}

export function getUnitStateUI(state: UnitDisplayState): UnitStateUI {
  switch (state) {
    case 'LOCKED':
      return { badge: '🔒 Locked', color: '#94a3b8', bg: '#f8fafc', cta: '', clickable: false };
    case 'AVAILABLE':
      return { badge: '▶️ Ready', color: '#2563eb', bg: '#eff6ff', cta: 'Start Unit →', clickable: true };
    case 'IN_PROGRESS':
      return { badge: '📝 In Progress', color: '#2563eb', bg: '#eff6ff', cta: 'Continue Unit →', clickable: true };
    case 'COMPLETED':
      return { badge: '✅ Complete', color: '#059669', bg: '#f0fdf4', cta: 'Review Unit →', clickable: true };
    case 'EXEMPT':
      return { badge: '✅ Complete', color: '#059669', bg: '#f0fdf4', cta: 'Review Unit →', clickable: true };
    default:
      return { badge: '⬜ Not Started', color: '#94a3b8', bg: '#ffffff', cta: '', clickable: false };
  }
}

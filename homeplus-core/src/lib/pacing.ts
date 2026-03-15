// ============================================
// Pacing Engine — Home Plus LMS
// ============================================
// Dual-status model: Academic Pacing + Engagement Status
// These are INDEPENDENT dimensions — a student can be
// "Slightly Behind + Stalled" or "Ahead + Active".
//
// Enrollment-aware: effective_start = max(Sept 1, enrollment_date)
// Activity = meaningful academic work (lesson/quiz/assignment completion),
//            NOT sign-in or passive page views.
//
// Future-ready: structured for assigned-path and weighted-completion pacing.

// ---------- Status Types (separate dimensions) ----------

/** Academic pacing relative to expected progress */
export type AcademicPacingStatus =
  | 'ON_PACE'
  | 'SLIGHTLY_BEHIND'
  | 'SIGNIFICANTLY_BEHIND'
  | 'AHEAD'
  | 'COMPLETE'
  | 'NEWLY_ENROLLED';

/** Engagement based on meaningful academic activity */
export type EngagementStatus = 'ACTIVE' | 'STALLED';

export interface PacingResult {
  // Dual status
  academicStatus: AcademicPacingStatus;
  engagementStatus: EngagementStatus;

  // Labels (plain-language, teacher-friendly)
  academicLabel: string;
  engagementLabel: string;
  pacingSummary: string;          // e.g. "52 days behind expected pace"

  // Progress data
  expectedProgress: number;       // 0–100, clamped
  actualProgress: number;         // 0–100, clamped
  completedLessons: number;
  totalLessons: number;
  daysBehindOrAhead: number;      // Negative = behind, positive = ahead

  // Activity data
  lastAcademicActivityAt: Date | null;
  daysSinceActive: number | null; // null = never active, ≥ 0

  // Grace period
  isGracePeriod: boolean;
  daysSinceEnrollment: number;
}

// ---------- Configuration ----------
// All thresholds in one place for easy tuning.

export const PACING_CONFIG = {
  // School year boundaries
  schoolYearStartMonth: 8,        // September (0-indexed)
  schoolYearStartDay: 1,
  schoolYearEndMonth: 5,          // June (0-indexed)
  schoolYearEndDay: 1,

  // Onboarding: days since enrollment before pacing alerts activate
  gracePeriodDays: 7,

  // Engagement: days without academic activity before marked stalled
  stalledThresholdDays: 5,

  // Academic pacing thresholds (ratio of actual/expected, as %)
  // These define the pacing band boundaries:
  //   Ahead:                ratio > aheadThreshold
  //   On Pace:              onPaceFloor ≤ ratio ≤ aheadThreshold
  //   Slightly Behind:      slightlyBehindFloor ≤ ratio < onPaceFloor
  //   Significantly Behind: ratio < slightlyBehindFloor
  aheadThreshold: 110,
  onPaceFloor: 90,
  slightlyBehindFloor: 70,

  // Intervention priority weights (lower = more urgent)
  // Engagement multiplier widens the gap between STALLED and ACTIVE
  interventionWeights: {
    academic: {
      SIGNIFICANTLY_BEHIND: 0,
      SLIGHTLY_BEHIND: 10,
      NEWLY_ENROLLED: 20,
      ON_PACE: 30,
      AHEAD: 40,
      COMPLETE: 50,
    } as Record<AcademicPacingStatus, number>,
    engagement: {
      STALLED: 0,
      ACTIVE: 5,
    } as Record<EngagementStatus, number>,
  },
} as const;

// ---------- Date Helpers ----------

function getSchoolYearStart(now: Date): Date {
  const year = now.getMonth() >= PACING_CONFIG.schoolYearStartMonth
    ? now.getFullYear()
    : now.getFullYear() - 1;
  return new Date(year, PACING_CONFIG.schoolYearStartMonth, PACING_CONFIG.schoolYearStartDay);
}

function getSchoolYearEnd(now: Date): Date {
  const year = now.getMonth() >= PACING_CONFIG.schoolYearStartMonth
    ? now.getFullYear() + 1
    : now.getFullYear();
  return new Date(year, PACING_CONFIG.schoolYearEndMonth, PACING_CONFIG.schoolYearEndDay);
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/** Clamp a number between min and max */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---------- Core Calculation ----------

export function calculatePacing(params: {
  enrolledAt: Date | null;
  completedLessons: number;
  totalLessons: number;
  lastAcademicActivityAt: Date | null;
  now?: Date;
}): PacingResult {
  const now = params.now || new Date();
  const { completedLessons, totalLessons, lastAcademicActivityAt } = params;

  const schoolYearStart = getSchoolYearStart(now);
  const schoolYearEnd = getSchoolYearEnd(now);
  const enrolledAt = params.enrolledAt || schoolYearStart;

  // Effective start = max(school_year_start, enrollment_date)
  const effectiveStart = enrolledAt > schoolYearStart ? enrolledAt : schoolYearStart;
  const totalDays = Math.max(1, daysBetween(effectiveStart, schoolYearEnd));
  const elapsedDays = daysBetween(effectiveStart, now);

  // Days since enrollment (for grace period — based on actual enrollment, not elapsed instructional days)
  const daysSinceEnrollment = daysBetween(enrolledAt, now);

  // Actual progress: 0–100, clamped
  const actualProgress = totalLessons > 0
    ? clamp((completedLessons / totalLessons) * 100, 0, 100)
    : 0;

  // Days since last meaningful academic activity: null = never, ≥ 0
  let daysSinceActive: number | null = null;
  if (lastAcademicActivityAt) {
    const raw = daysBetween(lastAcademicActivityAt, now);
    daysSinceActive = Math.max(0, raw); // Clamp: future dates → 0
  }

  // Expected progress: 0–100, clamped
  // Before effective start → 0, after school year end → 100
  let expectedProgress: number;
  if (elapsedDays <= 0) {
    expectedProgress = 0;
  } else if (elapsedDays >= totalDays) {
    expectedProgress = 100;
  } else {
    expectedProgress = clamp((elapsedDays / totalDays) * 100, 0, 100);
  }

  // Days behind/ahead (lesson-based)
  const expectedLessons = (expectedProgress / 100) * totalLessons;
  const lessonDiff = completedLessons - expectedLessons;
  const lessonsPerDay = totalDays > 0 ? totalLessons / totalDays : 0;
  const daysBehindOrAhead = lessonsPerDay > 0 ? Math.round(lessonDiff / lessonsPerDay) : 0;

  // ===== ENGAGEMENT STATUS (independent of pacing) =====
  const engagementStatus: EngagementStatus =
    daysSinceActive !== null && daysSinceActive >= PACING_CONFIG.stalledThresholdDays
      ? 'STALLED'
      : 'ACTIVE';

  const engagementLabel = formatEngagementLabel(engagementStatus, daysSinceActive);

  // ===== ACADEMIC PACING STATUS (independent of engagement) =====
  // Grace period: based explicitly on days since enrollment
  let academicStatus: AcademicPacingStatus;
  let academicLabel: string;
  let pacingSummary: string;
  let isGracePeriod = false;

  if (completedLessons >= totalLessons && totalLessons > 0) {
    academicStatus = 'COMPLETE';
    academicLabel = 'Complete';
    pacingSummary = 'All lessons completed';
  } else if (daysSinceEnrollment <= PACING_CONFIG.gracePeriodDays) {
    academicStatus = 'NEWLY_ENROLLED';
    academicLabel = 'Newly Enrolled';
    pacingSummary = 'Onboarding — pacing alerts paused';
    isGracePeriod = true;
  } else {
    // Pacing ratio: actual vs expected, as percentage
    const pacingRatio = expectedProgress > 0
      ? (actualProgress / expectedProgress) * 100
      : (actualProgress > 0 ? 200 : 100);

    if (pacingRatio > PACING_CONFIG.aheadThreshold) {
      academicStatus = 'AHEAD';
      academicLabel = 'Ahead';
      const absDays = Math.abs(daysBehindOrAhead);
      pacingSummary = absDays > 0 ? `${absDays} days ahead of expected pace` : 'Ahead of expected pace';
    } else if (pacingRatio >= PACING_CONFIG.onPaceFloor) {
      academicStatus = 'ON_PACE';
      academicLabel = 'On Pace';
      pacingSummary = 'Progressing at expected pace';
    } else if (pacingRatio >= PACING_CONFIG.slightlyBehindFloor) {
      academicStatus = 'SLIGHTLY_BEHIND';
      academicLabel = 'Slightly Behind';
      pacingSummary = `${Math.abs(daysBehindOrAhead)} days behind expected pace`;
    } else {
      academicStatus = 'SIGNIFICANTLY_BEHIND';
      academicLabel = 'Significantly Behind';
      pacingSummary = `${Math.abs(daysBehindOrAhead)} days behind expected pace`;
    }
  }

  return {
    academicStatus,
    engagementStatus,
    academicLabel,
    engagementLabel,
    pacingSummary,
    expectedProgress,
    actualProgress,
    completedLessons,
    totalLessons,
    daysBehindOrAhead,
    lastAcademicActivityAt,
    daysSinceActive,
    isGracePeriod,
    daysSinceEnrollment,
  };
}

// ---------- Style Helpers ----------

export function getAcademicPacingStyle(status: AcademicPacingStatus): {
  color: string; bg: string; icon: string;
} {
  const styles: Record<AcademicPacingStatus, { color: string; bg: string; icon: string }> = {
    ON_PACE:               { color: '#059669', bg: '#d1fae5', icon: '✅' },
    AHEAD:                 { color: '#2563eb', bg: '#dbeafe', icon: '🚀' },
    SLIGHTLY_BEHIND:       { color: '#d97706', bg: '#fef3c7', icon: '⚠️' },
    SIGNIFICANTLY_BEHIND:  { color: '#dc2626', bg: '#fee2e2', icon: '🔴' },
    NEWLY_ENROLLED:        { color: '#7c3aed', bg: '#ede9fe', icon: '🆕' },
    COMPLETE:              { color: '#059669', bg: '#d1fae5', icon: '🎉' },
  };
  return styles[status];
}

export function getEngagementStyle(status: EngagementStatus): {
  color: string; bg: string; icon: string;
} {
  const styles: Record<EngagementStatus, { color: string; bg: string; icon: string }> = {
    ACTIVE:  { color: '#059669', bg: '#d1fae5', icon: '🟢' },
    STALLED: { color: '#6b7280', bg: '#f3f4f6', icon: '⏸️' },
  };
  return styles[status];
}

// ---------- Formatting Helpers ----------

/** Teacher-friendly engagement label. Centralized — all pages use this. */
function formatEngagementLabel(status: EngagementStatus, daysSinceActive: number | null): string {
  if (daysSinceActive === null) return 'No academic activity yet';
  if (daysSinceActive === 0) return 'Active today';
  if (status === 'STALLED') {
    return `${daysSinceActive} day${daysSinceActive !== 1 ? 's' : ''} since academic activity`;
  }
  return `${daysSinceActive} day${daysSinceActive !== 1 ? 's' : ''} since academic activity`;
}

/** Format "days since active" for table columns / short display. */
export function formatDaysSinceActive(daysSinceActive: number | null): string {
  if (daysSinceActive === null) return 'No academic activity yet';
  if (daysSinceActive === 0) return 'Active today';
  if (daysSinceActive === 1) return '1 day since activity';
  return `${daysSinceActive} days since activity`;
}

/** Format pacing offset for teacher display. Uses absolute values + direction words. */
export function formatDaysOffset(days: number, isGrace: boolean): string {
  if (isGrace) return 'Onboarding';
  if (days === 0) return 'On pace';
  const absDays = Math.abs(days);
  const unit = absDays === 1 ? 'day' : 'days';
  if (days > 0) return `${absDays} ${unit} ahead`;
  return `${absDays} ${unit} behind`;
}

// ---------- Intervention Priority ----------

/**
 * Intervention priority sorting: lower = more urgent.
 *
 * Uses wider weight gaps so engagement (STALLED vs ACTIVE) has
 * meaningful impact on ordering:
 *   - SIG_BEHIND + STALLED (0)  sorts above  SIG_BEHIND + ACTIVE (5)
 *   - SLIGHTLY_BEHIND + STALLED (10)  sorts above  SLIGHTLY_BEHIND + ACTIVE (15)
 *   - SIG_BEHIND + ACTIVE (5)  still sorts above  SLIGHTLY_BEHIND + STALLED (10)
 */
export function getInterventionPriority(r: PacingResult): number {
  const aWeight = PACING_CONFIG.interventionWeights.academic[r.academicStatus];
  const eWeight = PACING_CONFIG.interventionWeights.engagement[r.engagementStatus];
  return aWeight + eWeight;
}

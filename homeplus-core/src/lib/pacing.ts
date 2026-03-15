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

  // Labels (plain-language)
  academicLabel: string;
  engagementLabel: string;
  pacingSummary: string;        // e.g. "8 days behind expected pace"

  // Progress data
  expectedProgress: number;     // 0–100%
  actualProgress: number;       // 0–100%
  completedLessons: number;
  totalLessons: number;
  daysBehindOrAhead: number;    // Negative = behind, positive = ahead

  // Activity data
  lastAcademicActivityAt: Date | null;
  daysSinceActive: number | null;

  // Grace period
  isGracePeriod: boolean;
}

// ---------- Configuration ----------

export const PACING_CONFIG = {
  gracePeriodDays: 7,           // Onboarding window before pacing alerts
  stalledThresholdDays: 5,      // Days without academic activity = stalled
  schoolYearStartMonth: 8,      // September (0-indexed)
  schoolYearStartDay: 1,
  schoolYearEndMonth: 5,        // June (0-indexed)
  schoolYearEndDay: 1,
} as const;

// ---------- Helpers ----------

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
  const totalDays = daysBetween(effectiveStart, schoolYearEnd);
  const elapsedDays = daysBetween(effectiveStart, now);

  // Actual progress
  const actualProgress = totalLessons > 0
    ? Math.min(100, (completedLessons / totalLessons) * 100)
    : 0;

  // Days since last meaningful academic activity
  const daysSinceActive = lastAcademicActivityAt
    ? daysBetween(lastAcademicActivityAt, now)
    : null;

  // Expected progress based on student's instructional window
  const expectedProgress = totalDays > 0
    ? Math.min(100, (elapsedDays / totalDays) * 100)
    : 0;

  // Expected lessons and day difference
  const expectedLessons = (expectedProgress / 100) * totalLessons;
  const lessonDiff = completedLessons - expectedLessons;
  const lessonsPerDay = totalDays > 0 ? totalLessons / totalDays : 0;
  const daysBehindOrAhead = lessonsPerDay > 0 ? Math.round(lessonDiff / lessonsPerDay) : 0;

  // ===== ENGAGEMENT STATUS (independent of pacing) =====
  const engagementStatus: EngagementStatus =
    daysSinceActive !== null && daysSinceActive >= PACING_CONFIG.stalledThresholdDays
      ? 'STALLED'
      : 'ACTIVE';

  const engagementLabel = engagementStatus === 'STALLED'
    ? `${daysSinceActive} days since last academic activity`
    : daysSinceActive === 0
      ? 'Active today'
      : daysSinceActive !== null
        ? `Active ${daysSinceActive}d ago`
        : 'No academic activity yet';

  // ===== ACADEMIC PACING STATUS (independent of engagement) =====
  let academicStatus: AcademicPacingStatus;
  let academicLabel: string;
  let pacingSummary: string;
  let isGracePeriod = false;

  if (completedLessons >= totalLessons && totalLessons > 0) {
    academicStatus = 'COMPLETE';
    academicLabel = 'Complete';
    pacingSummary = 'All lessons completed';
  } else if (elapsedDays <= PACING_CONFIG.gracePeriodDays) {
    academicStatus = 'NEWLY_ENROLLED';
    academicLabel = 'Newly Enrolled';
    pacingSummary = 'Onboarding — pacing alerts paused';
    isGracePeriod = true;
  } else {
    const pacingRatio = expectedProgress > 0
      ? (actualProgress / expectedProgress) * 100
      : (actualProgress > 0 ? 200 : 100);

    if (pacingRatio > 110) {
      academicStatus = 'AHEAD';
      academicLabel = 'Ahead';
      pacingSummary = `${Math.abs(daysBehindOrAhead)} days ahead of expected pace`;
    } else if (pacingRatio >= 90) {
      academicStatus = 'ON_PACE';
      academicLabel = 'On Pace';
      pacingSummary = 'Progressing at expected pace';
    } else if (pacingRatio >= 70) {
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

// ---------- Intervention Priority ----------

/** Sorting order: most urgent intervention first */
export function getInterventionPriority(r: PacingResult): number {
  // Combine academic urgency + engagement concern
  const academicWeight: Record<AcademicPacingStatus, number> = {
    SIGNIFICANTLY_BEHIND: 0,
    SLIGHTLY_BEHIND: 2,
    NEWLY_ENROLLED: 4,
    ON_PACE: 6,
    AHEAD: 8,
    COMPLETE: 10,
  };
  const engagementWeight: Record<EngagementStatus, number> = {
    STALLED: 0,
    ACTIVE: 1,
  };
  return academicWeight[r.academicStatus] + engagementWeight[r.engagementStatus];
}

/** Format "days since active" for teacher display */
export function formatDaysSinceActive(daysSinceActive: number | null): string {
  if (daysSinceActive === null) return 'No academic activity yet';
  if (daysSinceActive === 0) return 'Active today';
  if (daysSinceActive === 1) return '1 day ago';
  return `${daysSinceActive} days ago`;
}

/** Format days behind/ahead for teacher display */
export function formatDaysOffset(days: number, isGrace: boolean): string {
  if (isGrace) return '—';
  if (days === 0) return 'On pace';
  if (days > 0) return `+${days}d ahead`;
  return `${days}d behind`;
}

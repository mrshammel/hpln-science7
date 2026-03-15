// ============================================
// Pacing Engine — Home Plus LMS
// ============================================
// Enrollment-aware pacing with onboarding grace period.
// effective_start = max(school_year_start, student_enrollment_date)
// effective_end = school_year_end (June 1)
// expected_progress = time_elapsed / total_time_available

export type PacingStatus =
  | 'ON_PACE'
  | 'SLIGHTLY_BEHIND'
  | 'SIGNIFICANTLY_BEHIND'
  | 'AHEAD'
  | 'STALLED'
  | 'NEWLY_ENROLLED'   // Onboarding grace period
  | 'COMPLETE';

export interface PacingResult {
  status: PacingStatus;
  label: string;
  expectedProgress: number;   // 0–100% of lessons expected complete
  actualProgress: number;     // 0–100% of lessons actually complete
  completedLessons: number;
  totalLessons: number;
  daysBehindOrAhead: number;  // Negative = behind, positive = ahead
  lastActivityDate: Date | null;
  daysSinceLastActivity: number | null;
  isGracePeriod: boolean;
}

// Configuration
const GRACE_PERIOD_DAYS = 7;          // Days before pacing alerts activate
const STALLED_THRESHOLD_DAYS = 5;     // Days without activity = stalled
const SCHOOL_YEAR_START_MONTH = 8;    // September (0-indexed = 8)
const SCHOOL_YEAR_START_DAY = 1;
const SCHOOL_YEAR_END_MONTH = 5;      // June (0-indexed = 5)
const SCHOOL_YEAR_END_DAY = 1;

/**
 * Get the current school year start date.
 * If we're between Sept and Dec, school year started this calendar year.
 * If we're between Jan and June, school year started last calendar year.
 */
function getSchoolYearStart(now: Date): Date {
  const year = now.getMonth() >= SCHOOL_YEAR_START_MONTH
    ? now.getFullYear()
    : now.getFullYear() - 1;
  return new Date(year, SCHOOL_YEAR_START_MONTH, SCHOOL_YEAR_START_DAY);
}

function getSchoolYearEnd(now: Date): Date {
  const year = now.getMonth() >= SCHOOL_YEAR_START_MONTH
    ? now.getFullYear() + 1
    : now.getFullYear();
  return new Date(year, SCHOOL_YEAR_END_MONTH, SCHOOL_YEAR_END_DAY);
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate pacing for a single student.
 */
export function calculatePacing(params: {
  enrolledAt: Date | null;
  completedLessons: number;
  totalLessons: number;
  lastActivityDate: Date | null;
  now?: Date;
}): PacingResult {
  const now = params.now || new Date();
  const { completedLessons, totalLessons, lastActivityDate } = params;

  const schoolYearStart = getSchoolYearStart(now);
  const schoolYearEnd = getSchoolYearEnd(now);
  const enrolledAt = params.enrolledAt || schoolYearStart;

  // Effective start = max(school_year_start, enrollment_date)
  const effectiveStart = enrolledAt > schoolYearStart ? enrolledAt : schoolYearStart;
  const totalDays = daysBetween(effectiveStart, schoolYearEnd);
  const elapsedDays = daysBetween(effectiveStart, now);
  const daysSinceEnrollment = daysBetween(effectiveStart, now);

  // Actual progress percentage
  const actualProgress = totalLessons > 0
    ? Math.min(100, (completedLessons / totalLessons) * 100)
    : 0;

  // Days since last activity
  const daysSinceLastActivity = lastActivityDate
    ? daysBetween(lastActivityDate, now)
    : null;

  // Base result
  const result: PacingResult = {
    status: 'ON_PACE',
    label: 'On Pace',
    expectedProgress: 0,
    actualProgress,
    completedLessons,
    totalLessons,
    daysBehindOrAhead: 0,
    lastActivityDate,
    daysSinceLastActivity,
    isGracePeriod: false,
  };

  // All lessons done
  if (completedLessons >= totalLessons && totalLessons > 0) {
    result.status = 'COMPLETE';
    result.label = 'Complete';
    result.expectedProgress = 100;
    return result;
  }

  // Grace period: newly enrolled within GRACE_PERIOD_DAYS
  if (daysSinceEnrollment <= GRACE_PERIOD_DAYS) {
    result.status = 'NEWLY_ENROLLED';
    result.label = 'Newly Enrolled';
    result.isGracePeriod = true;
    result.expectedProgress = totalDays > 0
      ? Math.min(100, (elapsedDays / totalDays) * 100)
      : 0;
    return result;
  }

  // Expected progress based on time elapsed in student's instructional window
  const expectedProgress = totalDays > 0
    ? Math.min(100, (elapsedDays / totalDays) * 100)
    : 0;
  result.expectedProgress = expectedProgress;

  // Expected lessons completed at this point
  const expectedLessons = (expectedProgress / 100) * totalLessons;
  const lessonDiff = completedLessons - expectedLessons;

  // Convert lesson difference to days
  const lessonsPerDay = totalDays > 0 ? totalLessons / totalDays : 0;
  result.daysBehindOrAhead = lessonsPerDay > 0
    ? Math.round(lessonDiff / lessonsPerDay)
    : 0;

  // Check for stalled (no recent activity)
  if (daysSinceLastActivity !== null && daysSinceLastActivity >= STALLED_THRESHOLD_DAYS) {
    result.status = 'STALLED';
    result.label = 'Stalled';
    return result;
  }

  // Pacing ratio
  const pacingRatio = expectedProgress > 0
    ? (actualProgress / expectedProgress) * 100
    : (actualProgress > 0 ? 200 : 100);

  if (pacingRatio > 110) {
    result.status = 'AHEAD';
    result.label = 'Ahead';
  } else if (pacingRatio >= 90) {
    result.status = 'ON_PACE';
    result.label = 'On Pace';
  } else if (pacingRatio >= 70) {
    result.status = 'SLIGHTLY_BEHIND';
    result.label = 'Slightly Behind';
  } else {
    result.status = 'SIGNIFICANTLY_BEHIND';
    result.label = 'Significantly Behind';
  }

  return result;
}

/**
 * Get color and styling info for a pacing status.
 */
export function getPacingStyle(status: PacingStatus): {
  color: string;
  bg: string;
  icon: string;
} {
  switch (status) {
    case 'ON_PACE':
      return { color: '#059669', bg: '#d1fae5', icon: '✅' };
    case 'AHEAD':
      return { color: '#2563eb', bg: '#dbeafe', icon: '🚀' };
    case 'SLIGHTLY_BEHIND':
      return { color: '#d97706', bg: '#fef3c7', icon: '⚠️' };
    case 'SIGNIFICANTLY_BEHIND':
      return { color: '#dc2626', bg: '#fee2e2', icon: '🔴' };
    case 'STALLED':
      return { color: '#6b7280', bg: '#f3f4f6', icon: '⏸️' };
    case 'NEWLY_ENROLLED':
      return { color: '#7c3aed', bg: '#ede9fe', icon: '🆕' };
    case 'COMPLETE':
      return { color: '#059669', bg: '#d1fae5', icon: '🎉' };
  }
}

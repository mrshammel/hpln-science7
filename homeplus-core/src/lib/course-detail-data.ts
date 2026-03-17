// ============================================
// Student Course Detail — Data Helper
// ============================================
// Fetches a single course with unit-level progress
// for the /student/courses/[courseId] page.

import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  calculatePacing,
  getAcademicPacingStyle,
  type PacingResult,
} from '@/lib/pacing';
import { isLessonDone, resolveNextLesson, getLessonDisplayState, isLessonUnlocked, type LessonDisplayState } from '@/lib/lesson-progress';
import { resolveSubjectMode } from '@/lib/lesson-types';
import {
  isUnitSatisfied,
  isUnitUnlocked,
  getUnitDisplayState,
  resolveNextUnit,
  type UnitDisplayState,
  type UnitOverrideState,
} from '@/lib/unit-progress';

// ============= Types =============

export interface UnitDetail {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  order: number;
  lessons: {
    id: string;
    title: string;
    order: number;
    status: string;
    displayState: LessonDisplayState;
    completedAt: Date | null;
  }[];
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  unitStatus: 'not-started' | 'in-progress' | 'completed';
  unitDisplayState: UnitDisplayState;
  isClickable: boolean;
  isNextUnit: boolean;
  overrideState: UnitOverrideState | null;
}

export interface CourseDetail {
  subjectId: string;
  subjectName: string;
  subjectIcon: string;
  gradeLevel: number;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  averageScore: number | null;
  gradeLabel: string;
  pacing: PacingResult;
  pacingStyle: { color: string; bg: string; icon: string };
  currentUnit: string | null;
  currentLesson: string | null;
  nextLessonId: string | null;
  missingAssignments: number;
  nextUnitId: string | null;
  nextUnitTitle: string | null;
  units: UnitDetail[];
}

// ============= Main Loader =============

export async function getCourseDetail(courseId: string): Promise<CourseDetail | null> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return getDemoCourseDetail(courseId);
  }

  // Fetch the subject with full curriculum tree
  const subject = await prisma.subject.findUnique({
    where: { id: courseId },
    include: {
      units: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            include: {
              activities: {
                orderBy: { order: 'asc' },
                select: { id: true, type: true, title: true, points: true },
              },
            },
          },
        },
      },
    },
  });

  if (!subject || !subject.active) {
    return null;
  }

  // Verify student has access (same grade level)
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { gradeLevel: true, enrolledAt: true },
  });

  if (!dbUser) return null;
  const studentGrade = dbUser.gradeLevel || 7;
  if (subject.gradeLevel !== studentGrade) return null;

  // Fetch progress for this student's lessons in this subject
  const allLessonIds = subject.units.flatMap((u) => u.lessons.map((l) => l.id));
  const progressRecords = await prisma.studentProgress.findMany({
    where: { studentId: userId, lessonId: { in: allLessonIds } },
    select: { lessonId: true, status: true, completedAt: true },
  });
  const progressMap = new Map(progressRecords.map((p) => [p.lessonId, p]));

  // Fetch submissions for scoring
  const submissions = await prisma.submission.findMany({
    where: { studentId: userId, activity: { lesson: { unit: { subjectId: courseId } } } },
    select: { score: true, maxScore: true, activityId: true, submittedAt: true },
  });

  // Build unit details
  let nextLessonId: string | null = null;
  let currentUnit: string | null = null;
  let currentLesson: string | null = null;
  let totalCompleted = 0;
  let totalLessons = 0;

  const subjectMode = resolveSubjectMode(null, subject.name);

  // Fetch unit-level overrides for this student
  const allUnitIds = subject.units.map((u) => u.id);
  const unitOverrides = await (prisma as any).studentUnitAccess.findMany({
    where: { studentId: userId, unitId: { in: allUnitIds } },
  }) as { unitId: string; overrideState: string }[];
  const overrideMap = new Map<string, UnitOverrideState>(unitOverrides.map((o) => [o.unitId, o.overrideState as UnitOverrideState]));

  // Build unit details with gating
  const unitResults: UnitDetail[] = [];

  for (let ui = 0; ui < subject.units.length; ui++) {
    const unit = subject.units[ui];
    const lessons = unit.lessons.map((lesson, i) => {
      const progress = progressMap.get(lesson.id);
      const status = progress?.status ?? 'NOT_STARTED';
      const prevStatus = i === 0 ? null : (progressMap.get(unit.lessons[i - 1].id)?.status ?? 'NOT_STARTED');
      const unlocked = isLessonUnlocked(prevStatus, subjectMode);
      const displayState = getLessonDisplayState(status, unlocked);
      return {
        id: lesson.id,
        title: lesson.title,
        order: lesson.order,
        status,
        displayState,
        completedAt: progress?.completedAt ?? null,
      };
    });

    const completedLessons = lessons.filter((l) => isLessonDone(l.status)).length;
    const unitTotalLessons = lessons.length;
    totalCompleted += completedLessons;
    totalLessons += unitTotalLessons;

    const unitStatus: UnitDetail['unitStatus'] =
      completedLessons === unitTotalLessons && unitTotalLessons > 0
        ? 'completed'
        : completedLessons > 0 || lessons.some((l) => l.status === 'IN_PROGRESS' || l.status === 'NEEDS_RETEACH')
          ? 'in-progress'
          : 'not-started';

    // Unit override state
    const override = overrideMap.get(unit.id) ?? null;

    // Unit gating: is previous unit satisfied?
    const isFirstUnit = ui === 0;
    const prevSatisfied = isFirstUnit ? true : isUnitSatisfied(
      unitResults[ui - 1].unitStatus,
      overrideMap.get(subject.units[ui - 1].id) ?? null,
    );
    const unitUnlocked = isUnitUnlocked(prevSatisfied, override, isFirstUnit);
    const unitDisplay = getUnitDisplayState(unitStatus, unitUnlocked, override);

    // Track next lesson (only from unlocked units)
    if (!nextLessonId && unitUnlocked) {
      const resolved = resolveNextLesson(lessons.map((l) => ({ id: l.id, title: l.title, displayState: l.displayState })));
      if (resolved) {
        nextLessonId = resolved.id;
        currentUnit = unit.title;
        currentLesson = resolved.title;
      }
    }

    unitResults.push({
      id: unit.id,
      title: unit.title,
      description: unit.description,
      icon: unit.icon,
      order: unit.order,
      lessons,
      totalLessons: unitTotalLessons,
      completedLessons,
      progressPercent: unitTotalLessons > 0 ? Math.round((completedLessons / unitTotalLessons) * 100) : 0,
      unitStatus,
      unitDisplayState: unitDisplay,
      isClickable: unitDisplay !== 'LOCKED',
      isNextUnit: false, // set below
      overrideState: override,
    });
  }

  const units = unitResults;

  // Resolve next unit
  const nextUnit = resolveNextUnit(units.map((u) => ({ id: u.id, title: u.title, displayState: u.unitDisplayState })));
  if (nextUnit) {
    const target = units.find((u) => u.id === nextUnit.id);
    if (target) target.isNextUnit = true;
  }

  const progressPercent = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  // Average score
  const scoredSubmissions = submissions.filter((s) => s.score != null && s.maxScore != null && s.maxScore > 0);
  const averageScore =
    scoredSubmissions.length > 0
      ? Math.round(scoredSubmissions.reduce((sum, s) => sum + (s.score! / s.maxScore!) * 100, 0) / scoredSubmissions.length)
      : null;

  // Grade label
  const gradeLabel = averageScore != null ? getGradeLabel(averageScore) : 'No grades yet';

  // Pacing
  const lastActivityDate = submissions.length > 0
    ? submissions.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())[0]?.submittedAt
    : null;
  const lastProgressDate = progressRecords
    .filter((p) => p.completedAt)
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))[0]?.completedAt ?? null;
  const lastAcademicActivityAt = getLatestDate(lastActivityDate, lastProgressDate);

  const pacing = calculatePacing({
    enrolledAt: dbUser.enrolledAt,
    completedLessons: totalCompleted,
    totalLessons,
    lastAcademicActivityAt,
  });

  // Missing assignments
  const allActivities = subject.units.flatMap((u) => u.lessons.flatMap((l) => l.activities));
  const assignmentActivities = allActivities.filter((a) => a.type === 'ASSIGNMENT');
  const submittedActivityIds = new Set(submissions.map((s) => s.activityId));
  const missingAssignments = assignmentActivities.filter((a) => !submittedActivityIds.has(a.id)).length;

  return {
    subjectId: subject.id,
    subjectName: subject.name,
    subjectIcon: subject.icon,
    gradeLevel: subject.gradeLevel,
    totalLessons,
    completedLessons: totalCompleted,
    progressPercent,
    averageScore,
    gradeLabel,
    pacing,
    pacingStyle: getAcademicPacingStyle(pacing.academicStatus),
    currentUnit,
    currentLesson,
    nextLessonId,
    missingAssignments,
    nextUnitId: nextUnit?.id ?? null,
    nextUnitTitle: nextUnit?.title ?? null,
    units,
  };
}

// ============= Helpers =============

function getGradeLabel(percent: number): string {
  if (percent >= 90) return 'Exceeding';
  if (percent >= 75) return 'Meeting';
  if (percent >= 50) return 'Approaching';
  return 'Emerging';
}

function getLatestDate(a: Date | null, b: Date | null): Date | null {
  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

// ============= Demo Data =============

function getDemoCourseDetail(courseId: string): CourseDetail | null {
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

  const demoCourses: Record<string, { name: string; icon: string; units: { title: string; icon: string; desc: string; lessonCount: number; completed: number }[] }> = {
    'sci-7': {
      name: 'Science',
      icon: '🔬',
      units: [
        { title: 'Unit A — Interactions & Ecosystems', icon: '🌿', desc: 'Explore how living things interact within ecosystems', lessonCount: 6, completed: 6 },
        { title: 'Unit B — Plants for Food & Fibre', icon: '🌱', desc: 'How plants are grown and used to meet human needs', lessonCount: 6, completed: 6 },
        { title: 'Unit C — Heat & Temperature', icon: '🌡️', desc: 'Understanding heat transfer and thermal energy', lessonCount: 6, completed: 2 },
        { title: 'Unit D — Structures & Forces', icon: '🏗️', desc: 'Building structures that withstand forces', lessonCount: 6, completed: 0 },
      ],
    },
    'ela-7': {
      name: 'English Language Arts',
      icon: '📖',
      units: [
        { title: 'Unit 1 — Identity & Voice', icon: '🗣️', desc: 'Finding and expressing your personal voice', lessonCount: 5, completed: 5 },
        { title: 'Unit 2 — Research & Inquiry', icon: '🔍', desc: 'Learning to research and evaluate sources', lessonCount: 5, completed: 3 },
        { title: 'Unit 3 — Persuasion', icon: '✍️', desc: 'Crafting persuasive arguments and essays', lessonCount: 5, completed: 0 },
        { title: 'Unit 4 — Literature Circles', icon: '📚', desc: 'Collaborative reading and discussion', lessonCount: 5, completed: 0 },
      ],
    },
    'math-7': {
      name: 'Mathematics',
      icon: '🔢',
      units: [
        { title: 'Unit 1 — Number Sense', icon: '🔢', desc: 'Building strong number sense foundations', lessonCount: 5, completed: 5 },
        { title: 'Unit 2 — Fractions & Decimals', icon: '📐', desc: 'Operations with fractions and decimals', lessonCount: 6, completed: 6 },
        { title: 'Unit 3 — Patterns & Algebra', icon: '📊', desc: 'Recognizing patterns and algebraic thinking', lessonCount: 5, completed: 5 },
        { title: 'Unit 4 — Geometry', icon: '📏', desc: 'Shapes, area, perimeter, and spatial reasoning', lessonCount: 6, completed: 2 },
      ],
    },
  };

  const demoData = demoCourses[courseId];
  if (!demoData) return null;

  const units: UnitDetail[] = demoData.units.map((u, i) => {
    const lessons = Array.from({ length: u.lessonCount }, (_, j) => {
      const status = j < u.completed ? 'COMPLETE' : j === u.completed ? 'IN_PROGRESS' : 'NOT_STARTED';
      const prevStatus = j === 0 ? null : (j - 1 < u.completed ? 'COMPLETE' : 'NOT_STARTED');
      const unlocked = isLessonUnlocked(prevStatus, 'GENERAL');
      const displayState = getLessonDisplayState(status, unlocked);
      return {
        id: `${courseId}-u${i}-l${j}`,
        title: `Lesson ${j + 1}`,
        order: j,
        status,
        displayState,
        completedAt: j < u.completed ? daysAgo(30 - j) : null,
      };
    });

    const unitStatus = (u.completed === u.lessonCount ? 'completed' : u.completed > 0 ? 'in-progress' : 'not-started') as UnitDetail['unitStatus'];
    // Demo: sequential gating — unit unlocked if previous is completed
    const prevCompleted = i === 0 || demoData.units[i - 1].completed === demoData.units[i - 1].lessonCount;
    const demoUnlocked = i === 0 || prevCompleted;
    const demoDisplay: UnitDisplayState = !demoUnlocked ? 'LOCKED'
      : unitStatus === 'completed' ? 'COMPLETED'
      : unitStatus === 'in-progress' ? 'IN_PROGRESS'
      : 'AVAILABLE';

    return {
      id: `${courseId}-unit-${i}`,
      title: u.title,
      description: u.desc,
      icon: u.icon,
      order: i,
      lessons,
      totalLessons: u.lessonCount,
      completedLessons: u.completed,
      progressPercent: Math.round((u.completed / u.lessonCount) * 100),
      unitStatus,
      unitDisplayState: demoDisplay,
      isClickable: demoDisplay !== 'LOCKED',
      isNextUnit: false,
      overrideState: null,
    };
  });

  const totalLessons = units.reduce((s, u) => s + u.totalLessons, 0);
  const completedLessons = units.reduce((s, u) => s + u.completedLessons, 0);
  const progressPercent = Math.round((completedLessons / totalLessons) * 100);
  const nextUnit = units.find((u) => u.unitStatus !== 'completed');
  const nextLesson = nextUnit?.lessons.find((l) => l.status !== 'COMPLETE');

  const pacing = calculatePacing({
    enrolledAt: daysAgo(120),
    completedLessons,
    totalLessons,
    lastAcademicActivityAt: daysAgo(1),
  });

  // Mark next unit
  const demoNextUnit = units.find((u) => u.unitDisplayState === 'IN_PROGRESS' || u.unitDisplayState === 'AVAILABLE');
  if (demoNextUnit) demoNextUnit.isNextUnit = true;

  return {
    subjectId: courseId,
    subjectName: demoData.name,
    subjectIcon: demoData.icon,
    gradeLevel: 7,
    totalLessons,
    completedLessons,
    progressPercent,
    averageScore: courseId === 'math-7' ? 91 : courseId === 'sci-7' ? 82 : 76,
    gradeLabel: courseId === 'math-7' ? 'Exceeding' : 'Meeting',
    pacing,
    pacingStyle: getAcademicPacingStyle(pacing.academicStatus),
    currentUnit: nextUnit?.title ?? null,
    currentLesson: nextLesson?.title ?? null,
    nextLessonId: nextLesson?.id ?? null,
    missingAssignments: courseId === 'ela-7' ? 2 : courseId === 'sci-7' ? 1 : 0,
    nextUnitId: demoNextUnit?.id ?? null,
    nextUnitTitle: demoNextUnit?.title ?? null,
    units,
  };
}

import { prisma } from '@/lib/db';
import { ActivityType } from '@prisma/client';

/**
 * Grade Calculation Engine for Home Plus LMS
 *
 * Calculates weighted average grades from student submissions.
 * Each activity type has a configurable weight.
 * Grades are computed dynamically — never stored as static values.
 */

// Default category weights (must sum to 1.0)
export const DEFAULT_WEIGHTS: Record<ActivityType, { weight: number; label: string }> = {
  QUIZ:       { weight: 0.30, label: 'Quizzes' },
  ASSIGNMENT: { weight: 0.30, label: 'Assignments' },
  REFLECTION: { weight: 0.15, label: 'Reflections' },
  ACTIVITY:   { weight: 0.25, label: 'Activities' },
};

export interface CategoryGrade {
  type: ActivityType;
  label: string;
  weight: number;
  average: number | null;   // 0-100, null if no submissions
  count: number;
  totalPoints: number;
  earnedPoints: number;
}

export interface GradeReport {
  studentId: string;
  studentName: string;
  overallGrade: number | null;  // 0-100 weighted average
  categories: CategoryGrade[];
  totalSubmissions: number;
}

/**
 * Calculate grades for a student, optionally scoped to a subject.
 */
export async function calculateGrades(
  studentId: string,
  subjectId?: string,
  weights: Record<string, { weight: number; label: string }> = DEFAULT_WEIGHTS
): Promise<GradeReport> {
  // Fetch student
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true },
  });

  if (!student) {
    throw new Error(`Student not found: ${studentId}`);
  }

  // Build query filter for submissions
  const whereClause: any = { studentId };
  if (subjectId) {
    whereClause.activity = {
      lesson: {
        unit: {
          subjectId,
        },
      },
    };
  }

  // Fetch all submissions with activity type
  const submissions = await prisma.submission.findMany({
    where: whereClause,
    include: {
      activity: {
        select: {
          type: true,
          points: true,
        },
      },
    },
  });

  // Group by activity type
  const categories: CategoryGrade[] = [];
  let weightedTotal = 0;
  let weightSum = 0;

  for (const [type, config] of Object.entries(weights)) {
    const typeSubs = submissions.filter(s => s.activity.type === type);

    const category: CategoryGrade = {
      type: type as ActivityType,
      label: config.label,
      weight: config.weight,
      average: null,
      count: typeSubs.length,
      totalPoints: 0,
      earnedPoints: 0,
    };

    if (typeSubs.length > 0) {
      // Calculate percentage for each submission, then average
      let totalPct = 0;
      for (const sub of typeSubs) {
        const maxScore = sub.maxScore || sub.activity.points || 1;
        const score = sub.score || 0;
        const pct = Math.min((score / maxScore) * 100, 100);
        totalPct += pct;
        category.totalPoints += maxScore;
        category.earnedPoints += score;
      }
      category.average = Math.round(totalPct / typeSubs.length);

      // Add to weighted total
      weightedTotal += (category.average / 100) * config.weight;
      weightSum += config.weight;
    }

    categories.push(category);
  }

  // Calculate overall weighted average
  const overallGrade = weightSum > 0
    ? Math.round((weightedTotal / weightSum) * 100)
    : null;

  return {
    studentId: student.id,
    studentName: student.name,
    overallGrade,
    categories,
    totalSubmissions: submissions.length,
  };
}

/**
 * Calculate grades for all students in a class (teacher view).
 */
export async function calculateClassGrades(
  gradeLevel: number,
  subjectId?: string
): Promise<GradeReport[]> {
  const students = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      gradeLevel,
    },
    select: { id: true },
  });

  const reports: GradeReport[] = [];
  for (const student of students) {
    reports.push(await calculateGrades(student.id, subjectId));
  }

  return reports.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));
}

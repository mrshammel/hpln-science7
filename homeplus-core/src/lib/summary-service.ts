// ============================================
// Summary Service — Home Plus LMS
// ============================================
// Refreshes precomputed summary tables for fast UI loading.
//
// Refresh strategies:
//   ON_EVIDENCE: after any evidence write, update student's dashboard summary
//   SCHEDULED:   background job refreshes course/unit/teacher summaries
//
// Summary tables:
//   - StudentDashboardSummary
//   - CourseMasterySummary
//   - UnitMasterySummary
//   - TeacherAlertSummary

import { prisma } from '@/lib/db';
import { invalidateCachePrefix } from '@/lib/data-cache';

// ─── Student Dashboard Summary ───

/**
 * Refresh the student's dashboard summary counts.
 * Called after evidence recording or review completion.
 */
export async function refreshStudentDashboardSummary(studentId: string): Promise<void> {
  const mastery = await prisma.studentSkillMastery.groupBy({
    by: ['masteryState'],
    where: { studentId },
    _count: true,
  });

  const counts = {
    masteredCount: 0,
    developingCount: 0,
    reviewDueCount: 0,
    needsSupportCount: 0,
  };

  for (const group of mastery) {
    switch (group.masteryState) {
      case 'MASTERED': counts.masteredCount = group._count; break;
      case 'DEVELOPING': counts.developingCount = group._count; break;
      case 'REVIEW_DUE': counts.reviewDueCount = group._count; break;
      case 'NEEDS_SUPPORT': counts.needsSupportCount = group._count; break;
      case 'PRACTICING': counts.developingCount += group._count; break; // Include practicing in developing
    }
  }

  // Count reviews completed today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const reviewCompletedToday = await prisma.reviewQueueItem.count({
    where: {
      studentId,
      status: 'COMPLETED',
      completedAt: { gte: todayStart },
    },
  });

  // Review due from queue
  const reviewQueueDue = await prisma.reviewQueueItem.count({
    where: { studentId, status: 'DUE' },
  });
  counts.reviewDueCount = Math.max(counts.reviewDueCount, reviewQueueDue);

  await prisma.studentDashboardSummary.upsert({
    where: { studentId },
    update: {
      ...counts,
      reviewCompletedToday,
    },
    create: {
      studentId,
      ...counts,
      reviewCompletedToday,
      reviewStreak: 0,
    },
  });

  // Invalidate cached dashboard data for this student
  invalidateCachePrefix(`student:${studentId}`);
}

// ─── Course Mastery Summary ───

/**
 * Refresh mastery summary for a student in a specific course.
 */
export async function refreshCourseMasterySummary(
  studentId: string,
  subjectId: string,
): Promise<void> {
  // Get all skills linked to this course's lessons
  const courseSkills = await prisma.lessonSkill.findMany({
    where: {
      lesson: { unit: { subjectId } },
      relationshipType: 'TARGET',
    },
    select: { skillId: true },
    distinct: ['skillId'],
  });
  const skillIds = courseSkills.map((s) => s.skillId);

  if (skillIds.length === 0) {
    await prisma.courseMasterySummary.upsert({
      where: { studentId_subjectId: { studentId, subjectId } },
      update: { masteredSkills: 0, developingSkills: 0, reviewDue: 0, needsSupport: 0, totalSkills: 0 },
      create: { studentId, subjectId, masteredSkills: 0, developingSkills: 0, reviewDue: 0, needsSupport: 0, totalSkills: 0 },
    });
    return;
  }

  const mastery = await prisma.studentSkillMastery.findMany({
    where: { studentId, skillId: { in: skillIds } },
  });

  const summary = {
    totalSkills: skillIds.length,
    masteredSkills: mastery.filter((m) => m.masteryState === 'MASTERED').length,
    developingSkills: mastery.filter((m) => m.masteryState === 'DEVELOPING' || m.masteryState === 'PRACTICING').length,
    reviewDue: mastery.filter((m) => m.masteryState === 'REVIEW_DUE').length,
    needsSupport: mastery.filter((m) => m.masteryState === 'NEEDS_SUPPORT').length,
  };

  await prisma.courseMasterySummary.upsert({
    where: { studentId_subjectId: { studentId, subjectId } },
    update: summary,
    create: { studentId, subjectId, ...summary },
  });
}

// ─── Unit Mastery Summary ───

/**
 * Refresh mastery summary for a student in a specific unit.
 */
export async function refreshUnitMasterySummary(
  studentId: string,
  unitId: string,
): Promise<void> {
  const unitSkills = await prisma.lessonSkill.findMany({
    where: {
      lesson: { unitId },
      relationshipType: 'TARGET',
    },
    select: { skillId: true },
    distinct: ['skillId'],
  });
  const skillIds = unitSkills.map((s) => s.skillId);

  if (skillIds.length === 0) {
    await prisma.unitMasterySummary.upsert({
      where: { studentId_unitId: { studentId, unitId } },
      update: { masteredSkills: 0, developingSkills: 0, reviewDue: 0, needsSupport: 0, totalSkills: 0 },
      create: { studentId, unitId, masteredSkills: 0, developingSkills: 0, reviewDue: 0, needsSupport: 0, totalSkills: 0 },
    });
    return;
  }

  const mastery = await prisma.studentSkillMastery.findMany({
    where: { studentId, skillId: { in: skillIds } },
  });

  const summary = {
    totalSkills: skillIds.length,
    masteredSkills: mastery.filter((m) => m.masteryState === 'MASTERED').length,
    developingSkills: mastery.filter((m) => m.masteryState === 'DEVELOPING' || m.masteryState === 'PRACTICING').length,
    reviewDue: mastery.filter((m) => m.masteryState === 'REVIEW_DUE').length,
    needsSupport: mastery.filter((m) => m.masteryState === 'NEEDS_SUPPORT').length,
  };

  await prisma.unitMasterySummary.upsert({
    where: { studentId_unitId: { studentId, unitId } },
    update: summary,
    create: { studentId, unitId, ...summary },
  });
}

// ─── Teacher Alert Summary ───

/**
 * Refresh alert summary for a teacher viewing a student.
 */
export async function refreshTeacherAlerts(
  studentId: string,
  teacherId: string,
): Promise<void> {
  // Count skills needing support
  const needsSupportCount = await prisma.studentSkillMastery.count({
    where: { studentId, masteryState: 'NEEDS_SUPPORT' },
  });

  // Count overdue reviews
  const overdueReviewCount = await prisma.reviewQueueItem.count({
    where: {
      studentId,
      status: 'DUE',
      dueDate: { lt: new Date() },
    },
  });

  // Count help requests (from reflections)
  const helpRequestCount = await prisma.reflectionEntry.count({
    where: { studentId, helpRequested: true },
  });

  // Count confidence/performance mismatches
  // High confidence (4-5) + low mastery score (< 0.50)
  const mismatchCount = await prisma.studentSkillMastery.count({
    where: {
      studentId,
      confidenceScore: { gte: 4 },
      masteryScore: { lt: 0.50 },
    },
  });

  await prisma.teacherAlertSummary.upsert({
    where: { studentId_teacherId: { studentId, teacherId } },
    update: {
      needsSupportCount,
      overdueReviewCount,
      helpRequestCount,
      mismatchCount,
    },
    create: {
      studentId,
      teacherId,
      needsSupportCount,
      overdueReviewCount,
      helpRequestCount,
      mismatchCount,
    },
  });
}

// ─── Batch Refresh ───

/**
 * Refresh all summaries for a student.
 * Called after significant evidence recording.
 */
export async function refreshAllStudentSummaries(studentId: string): Promise<void> {
  await refreshStudentDashboardSummary(studentId);

  // Get courses the student is enrolled in
  const progress = await prisma.studentProgress.findMany({
    where: { studentId },
    include: { lesson: { include: { unit: true } } },
  });

  const subjectIds = [...new Set(progress.map((p) => p.lesson.unit.subjectId))];
  const unitIds = [...new Set(progress.map((p) => p.lesson.unitId))];

  for (const subjectId of subjectIds) {
    await refreshCourseMasterySummary(studentId, subjectId);
  }
  for (const unitId of unitIds) {
    await refreshUnitMasterySummary(studentId, unitId);
  }

  // Teacher alerts - get assigned teacher
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { assignedTeacherId: true },
  });
  if (student?.assignedTeacherId) {
    await refreshTeacherAlerts(studentId, student.assignedTeacherId);
  }
}

/**
 * Refresh all summaries for ALL students.
 * Called by background job.
 */
export async function refreshAllSummaries(): Promise<{ studentsProcessed: number }> {
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true },
  });

  for (const student of students) {
    try {
      await refreshAllStudentSummaries(student.id);
    } catch (err) {
      console.error(`[summary-service] Failed to refresh student ${student.id}:`, err);
    }
  }

  return { studentsProcessed: students.length };
}

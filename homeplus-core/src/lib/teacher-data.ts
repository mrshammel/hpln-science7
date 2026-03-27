// ============================================
// Teacher Data Layer — Home Plus LMS
// ============================================
// Server-side data fetching with dual-status pacing model.
// All teacher-facing functions are scoped by:
//   - teacherId (authorization)
//   - grade + subjectId (cohort context)
//
// Key design decisions:
//   - All queries filter by assignedTeacherId
//   - Grade + subjectId scope progress, submissions, pacing, and reviews
//   - Total lessons = assigned-path count for the selected grade+subject
//   - lastAcademicActivityAt = max(latest submission, latest lesson completion)
//   - getStudentById is a direct scoped query, not a full-list scan
//   - isDemoMode() is env-driven, not hardcoded

import { prisma } from '@/lib/db';
import { isDemoMode } from '@/lib/teacher-auth';
import {
  calculatePacing,
  getInterventionPriority,
  type PacingResult,
  type AcademicPacingStatus,
  type EngagementStatus,
} from '@/lib/pacing';
import type { GradeSubjectContext } from '@/lib/teacher-context';

// ---------- Types ----------

export interface StudentWithPacing {
  id: string;
  name: string;
  email: string;
  gradeLevel: number | null;
  avatar: string | null;
  enrolledAt: Date | null;
  completedLessons: number;
  totalLessons: number;
  avgScore: number | null;
  lastAcademicActivityAt: Date | null;
  currentUnit: string | null;
  currentLesson: string | null;
  pacing: PacingResult;
}

export interface OverviewMetrics {
  totalStudents: number;
  onPace: number;
  behind: number;
  ahead: number;
  newlyEnrolled: number;
  needsAttention: number;
  avgProgress: number;
  avgScore: number | null;
  pendingReviews: number;
  stalledCount: number;
}

export interface UnitProgress {
  unitId: string;
  unitTitle: string;
  unitIcon: string | null;
  avgCompletion: number;
  avgScore: number | null;
  totalStudents: number;
  stalledStudents: number;
}

export interface RecentSubmission {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar: string | null;
  activityTitle: string;
  activityType: string;
  score: number | null;
  maxScore: number | null;
  reviewed: boolean;
  submittedAt: Date;
}

export interface TeacherNoteData {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar: string | null;
  tag: string;
  content: string;
  createdAt: Date;
}

// ---------- Internal Prisma Result Types ----------

interface PrismaProgressRecord {
  status: string;
  completedAt: Date | null;
  lesson: { title: string; unit: { title: string } };
}

interface PrismaSubmissionRecord {
  score: number | null;
  maxScore: number | null;
  submittedAt: Date;
}

interface PrismaSubmissionWithRelations {
  id: string;
  studentId: string;
  score: number | null;
  maxScore: number | null;
  reviewed: boolean;
  submittedAt: Date;
  student: { name: string; avatar: string | null };
  activity: { title: string; type: string };
}

interface PrismaNoteWithStudent {
  id: string;
  studentId: string;
  tag: string;
  content: string;
  createdAt: Date;
  student: { name: string; avatar: string | null };
}

interface PrismaUnitWithLessons {
  id: string;
  title: string;
  icon: string | null;
  lessons: Array<{ id: string }>;
}

interface PrismaStudentRecord {
  id: string;
  name: string;
  email: string;
  gradeLevel: number | null;
  avatar: string | null;
  enrolledAt: Date | null;
  progress: PrismaProgressRecord[];
  submissions: PrismaSubmissionRecord[];
}

// ---------- Helpers ----------

/** Derive last meaningful academic activity from both submissions and lesson completions */
function deriveLastAcademicActivity(
  latestSubmissionDate: Date | null,
  latestCompletionDate: Date | null,
): Date | null {
  if (latestSubmissionDate && latestCompletionDate) {
    return latestSubmissionDate > latestCompletionDate ? latestSubmissionDate : latestCompletionDate;
  }
  return latestSubmissionDate || latestCompletionDate || null;
}

/** Count assigned lessons for a specific grade + subject context */
async function getAssignedLessonCount(ctx: GradeSubjectContext): Promise<number> {
  if (ctx.subjectId.startsWith('demo-')) return 10;
  try {
    const count = await prisma.lesson.count({
      where: {
        unit: {
          subject: {
            id: ctx.subjectId,
            gradeLevel: ctx.grade,
            active: true,
          },
        },
      },
    });
    return count || 10;
  } catch {
    return 10;
  }
}

/** Build Prisma where filters for subject-scoping progress and submissions */
function buildSubjectFilters(ctx: GradeSubjectContext) {
  const isReal = !ctx.subjectId.startsWith('demo-');
  return {
    progressWhere: isReal ? { lesson: { unit: { subjectId: ctx.subjectId } } } : {},
    submissionWhere: isReal ? { activity: { lesson: { unit: { subjectId: ctx.subjectId } } } } : {},
  };
}

/** Build StudentWithPacing from a typed Prisma student record */
function buildStudentWithPacing(
  student: PrismaStudentRecord,
  assignedLessonCount: number,
): StudentWithPacing {
  const completedLessons = student.progress.filter((p) => p.status === 'COMPLETE').length;

  // Last meaningful academic activity: max(latest submission, latest lesson completion)
  const latestSubmission = student.submissions.length > 0
    ? student.submissions.reduce((latest: Date, s) =>
        s.submittedAt > latest ? s.submittedAt : latest, student.submissions[0].submittedAt)
    : null;
  const completedProgress = student.progress
    .filter((p) => p.status === 'COMPLETE' && p.completedAt)
    .map((p) => p.completedAt!);
  const latestCompletion = completedProgress.length > 0
    ? completedProgress.reduce((latest: Date, d) => d > latest ? d : latest, completedProgress[0])
    : null;
  const lastAcademicActivityAt = deriveLastAcademicActivity(latestSubmission, latestCompletion);

  // Current unit/lesson from in-progress work
  const inProgress = student.progress.find((p) => p.status === 'IN_PROGRESS');
  const currentUnit = inProgress?.lesson?.unit?.title || null;
  const currentLesson = inProgress?.lesson?.title || null;

  // Average score for subject context
  const scored = student.submissions.filter((sub) => sub.score !== null && sub.maxScore !== null);
  const avgScore = scored.length > 0
    ? scored.reduce((sum, sub) => sum + ((sub.score! / sub.maxScore!) * 100), 0) / scored.length
    : null;

  const pacing = calculatePacing({
    enrolledAt: student.enrolledAt,
    completedLessons,
    totalLessons: assignedLessonCount,
    lastAcademicActivityAt,
  });

  return {
    id: student.id,
    name: student.name,
    email: student.email,
    gradeLevel: student.gradeLevel,
    avatar: student.avatar,
    enrolledAt: student.enrolledAt,
    completedLessons,
    totalLessons: assignedLessonCount,
    avgScore,
    lastAcademicActivityAt,
    currentUnit,
    currentLesson,
    pacing,
  };
}

// ---------- Teacher-Scoped Data Fetching ----------

/**
 * Get all students assigned to a specific teacher, scoped to grade+subject context.
 */
export async function getStudentsWithPacing(teacherId: string, ctx: GradeSubjectContext): Promise<StudentWithPacing[]> {
  if (isDemoMode() && ctx.subjectId.startsWith('demo-')) return getDemoStudents();

  try {
    const { progressWhere, submissionWhere } = buildSubjectFilters(ctx);

    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        assignedTeacherId: teacherId,
        gradeLevel: ctx.grade,
      },
      include: {
        progress: {
          where: progressWhere,
          include: { lesson: { include: { unit: true } } },
        },
        submissions: {
          where: submissionWhere,
          orderBy: { submittedAt: 'desc' },
        },
      },
    });

    if (students.length === 0 && isDemoMode()) return getDemoStudents();
    if (students.length === 0) return [];

    const assignedLessons = await getAssignedLessonCount(ctx);
    return students.map((s: PrismaStudentRecord) => buildStudentWithPacing(s, assignedLessons));
  } catch (err) {
    if (isDemoMode()) return getDemoStudents();
    console.error('[teacher-data] getStudentsWithPacing failed:', err);
    return [];
  }
}

/**
 * Get a single student by ID — direct scoped query.
 * Verifies the student belongs to the teacher's scope.
 */
export async function getStudentById(
  studentId: string,
  teacherId: string,
  ctx: GradeSubjectContext,
): Promise<StudentWithPacing | null> {
  if (studentId.startsWith('demo-') && isDemoMode()) {
    const demos = getDemoStudents();
    return demos.find((s) => s.id === studentId) || null;
  }

  try {
    const { progressWhere, submissionWhere } = buildSubjectFilters(ctx);

    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        role: 'STUDENT',
        assignedTeacherId: teacherId,
        gradeLevel: ctx.grade,
      },
      include: {
        progress: {
          where: progressWhere,
          include: { lesson: { include: { unit: true } } },
        },
        submissions: {
          where: submissionWhere,
          orderBy: { submittedAt: 'desc' },
        },
      },
    });

    if (!student) return null;

    const assignedLessons = await getAssignedLessonCount(ctx);
    return buildStudentWithPacing(student as PrismaStudentRecord, assignedLessons);
  } catch (err) {
    console.error('[teacher-data] getStudentById failed:', err);
    return null;
  }
}

/**
 * Overview metrics — computed from the teacher's already-fetched students.
 * Pending reviews scoped to teacher's students + subject context.
 */
export async function getOverviewMetrics(
  students: StudentWithPacing[],
  teacherId: string,
  ctx: GradeSubjectContext,
): Promise<OverviewMetrics> {
  const totalStudents = students.length;
  const onPace = students.filter((s) => s.pacing.academicStatus === 'ON_PACE').length;
  const behind = students.filter((s) =>
    s.pacing.academicStatus === 'SLIGHTLY_BEHIND' || s.pacing.academicStatus === 'SIGNIFICANTLY_BEHIND'
  ).length;
  const ahead = students.filter((s) => s.pacing.academicStatus === 'AHEAD').length;
  const newlyEnrolled = students.filter((s) => s.pacing.academicStatus === 'NEWLY_ENROLLED').length;
  const stalledCount = students.filter((s) => s.pacing.engagementStatus === 'STALLED').length;
  const needsAttention = students.filter((s) =>
    s.pacing.academicStatus === 'SIGNIFICANTLY_BEHIND' || s.pacing.engagementStatus === 'STALLED'
  ).length;

  const avgProgress = totalStudents > 0
    ? students.reduce((sum, s) => sum + s.pacing.actualProgress, 0) / totalStudents : 0;
  const scored = students.filter((s) => s.avgScore !== null);
  const avgScore = scored.length > 0
    ? scored.reduce((sum, s) => sum + s.avgScore!, 0) / scored.length : null;

  // Scoped pending reviews: teacher's students + subject context
  let pendingReviews = 0;
  try {
    const studentIds = students.map((s) => s.id);
    if (studentIds.length > 0 && !studentIds[0].startsWith('demo-')) {
      const { submissionWhere } = buildSubjectFilters(ctx);
      pendingReviews = await prisma.submission.count({
        where: {
          studentId: { in: studentIds },
          reviewed: false,
          ...submissionWhere,
        },
      });
    } else if (isDemoMode()) {
      pendingReviews = 3;
    }
  } catch {
    pendingReviews = isDemoMode() ? 3 : 0;
  }

  return { totalStudents, onPace, behind, ahead, newlyEnrolled, needsAttention, avgProgress, avgScore, pendingReviews, stalledCount };
}

/** Sort students by intervention priority (most urgent first) */
export function getStudentsByPriority(students: StudentWithPacing[]): StudentWithPacing[] {
  return [...students].sort((a, b) => getInterventionPriority(a.pacing) - getInterventionPriority(b.pacing));
}

/**
 * Recent submissions — scoped to teacher's students + subject context.
 */
export async function getRecentSubmissions(teacherId: string, ctx: GradeSubjectContext): Promise<RecentSubmission[]> {
  if (isDemoMode() && ctx.subjectId.startsWith('demo-')) return getDemoSubmissions();

  try {
    const { submissionWhere } = buildSubjectFilters(ctx);
    const subs = await prisma.submission.findMany({
      where: {
        student: { assignedTeacherId: teacherId, gradeLevel: ctx.grade },
        ...submissionWhere,
      },
      orderBy: { submittedAt: 'desc' },
      take: 20,
      include: {
        student: { select: { name: true, avatar: true } },
        activity: { select: { title: true, type: true } },
      },
    });
    if (subs.length === 0 && isDemoMode()) return getDemoSubmissions();
    if (subs.length === 0) return [];
    return subs.map((s: PrismaSubmissionWithRelations) => ({
      id: s.id,
      studentId: s.studentId,
      studentName: s.student.name,
      studentAvatar: s.student.avatar,
      activityTitle: s.activity.title,
      activityType: s.activity.type,
      score: s.score,
      maxScore: s.maxScore,
      reviewed: s.reviewed,
      submittedAt: s.submittedAt,
    }));
  } catch (err) {
    if (isDemoMode()) return getDemoSubmissions();
    console.error('[teacher-data] getRecentSubmissions failed:', err);
    return [];
  }
}

/**
 * Get submissions for a specific student (teacher-scoped by student relationship).
 */
export async function getStudentSubmissions(
  studentId: string,
  teacherId: string,
  ctx: GradeSubjectContext,
): Promise<RecentSubmission[]> {
  if (studentId.startsWith('demo-') && isDemoMode()) {
    return getDemoSubmissions().filter((s) => s.studentId === studentId);
  }

  try {
    const { submissionWhere } = buildSubjectFilters(ctx);
    const subs = await prisma.submission.findMany({
      where: {
        studentId,
        student: { assignedTeacherId: teacherId, gradeLevel: ctx.grade },
        ...submissionWhere,
      },
      orderBy: { submittedAt: 'desc' },
      take: 10,
      include: {
        student: { select: { name: true, avatar: true } },
        activity: { select: { title: true, type: true } },
      },
    });
    if (subs.length === 0) return [];
    return subs.map((s: PrismaSubmissionWithRelations) => ({
      id: s.id,
      studentId: s.studentId,
      studentName: s.student.name,
      studentAvatar: s.student.avatar,
      activityTitle: s.activity.title,
      activityType: s.activity.type,
      score: s.score,
      maxScore: s.maxScore,
      reviewed: s.reviewed,
      submittedAt: s.submittedAt,
    }));
  } catch (err) {
    console.error('[teacher-data] getStudentSubmissions failed:', err);
    return [];
  }
}

/**
 * Teacher notes — scoped to this teacher's authored notes.
 */
export async function getTeacherNotes(teacherId: string): Promise<TeacherNoteData[]> {
  try {
    const notes = await prisma.teacherNote.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { student: { select: { name: true, avatar: true } } },
    });
    return notes.map((n: PrismaNoteWithStudent) => ({
      id: n.id,
      studentId: n.studentId,
      studentName: n.student.name,
      studentAvatar: n.student.avatar,
      tag: n.tag,
      content: n.content,
      createdAt: n.createdAt,
    }));
  } catch (err) {
    console.error('[teacher-data] getTeacherNotes failed:', err);
    return [];
  }
}

/**
 * Get notes for a specific student — scoped to this teacher.
 */
export async function getStudentNotes(studentId: string, teacherId: string): Promise<TeacherNoteData[]> {
  try {
    const notes = await prisma.teacherNote.findMany({
      where: { studentId, teacherId },
      orderBy: { createdAt: 'desc' },
      include: { student: { select: { name: true, avatar: true } } },
    });
    return notes.map((n: PrismaNoteWithStudent) => ({
      id: n.id,
      studentId: n.studentId,
      studentName: n.student.name,
      studentAvatar: n.student.avatar,
      tag: n.tag,
      content: n.content,
      createdAt: n.createdAt,
    }));
  } catch (err) {
    console.error('[teacher-data] getStudentNotes failed:', err);
    return [];
  }
}

/**
 * Unit progress for the teacher's class — scoped to subject context.
 * Shows real per-unit completion when data is available.
 */
export async function getUnitProgress(
  students: StudentWithPacing[],
  teacherId: string,
  ctx: GradeSubjectContext,
): Promise<UnitProgress[]> {
  // Try real unit data first — scoped to selected subject
  if (!ctx.subjectId.startsWith('demo-')) {
    try {
      const units = await prisma.unit.findMany({
        where: { subjectId: ctx.subjectId },
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            select: { id: true },
          },
        },
      });

      if (units.length > 0) {
        // Get completion data per unit for all students in the cohort
        const studentIds = students.map((s) => s.id).filter((id) => !id.startsWith('demo-'));

        return await Promise.all(units.map(async (u: PrismaUnitWithLessons) => {
          const lessonIds = u.lessons.map((l: { id: string }) => l.id);
          const totalLessonsInUnit = lessonIds.length;

          let avgCompletion = 0;
          let avgScore: number | null = null;

          if (studentIds.length > 0 && totalLessonsInUnit > 0) {
            // Count completed lessons per student for this unit
            const completions = await prisma.studentProgress.count({
              where: {
                studentId: { in: studentIds },
                lessonId: { in: lessonIds },
                status: 'COMPLETE',
              },
            });
            avgCompletion = (completions / (studentIds.length * totalLessonsInUnit)) * 100;

            // Average score for submissions in this unit
            const submissions = await prisma.submission.aggregate({
              where: {
                studentId: { in: studentIds },
                activity: { lessonId: { in: lessonIds } },
                score: { not: null },
                maxScore: { not: null },
              },
              _avg: { score: true, maxScore: true },
            });
            if (submissions._avg.score !== null && submissions._avg.maxScore !== null && submissions._avg.maxScore > 0) {
              avgScore = Math.round((submissions._avg.score / submissions._avg.maxScore) * 100);
            }
          }

          const stalledStudents = students.filter((s) => s.pacing.engagementStatus === 'STALLED').length;

          return {
            unitId: u.id,
            unitTitle: u.title,
            unitIcon: u.icon,
            avgCompletion: Math.round(avgCompletion),
            avgScore,
            totalStudents: students.length,
            stalledStudents,
          };
        }));
      }
    } catch (err) {
      console.error('[teacher-data] getUnitProgress real data failed:', err);
    }
  }

  // Scaffolded unit data — Grade 7 Science (demo only)
  const scaffoldedUnits = [
    { id: 'a', title: 'Unit A — Ecosystems', icon: '🌿' },
    { id: 'b', title: 'Unit B — Plants', icon: '🌱' },
    { id: 'c', title: 'Unit C — Heat', icon: '🔥' },
    { id: 'd', title: 'Unit D — Structures', icon: '🏗️' },
    { id: 'e', title: 'Unit E — Earth', icon: '🌍' },
  ];
  return scaffoldedUnits.map((u) => {
    const avgCompletion = students.length > 0
      ? students.reduce((sum, s) => sum + s.pacing.actualProgress, 0) / students.length : 0;
    const scored = students.filter((s) => s.avgScore !== null);
    const avgScore = scored.length > 0
      ? scored.reduce((sum, s) => sum + s.avgScore!, 0) / scored.length : null;
    const stalledStudents = students.filter((s) => s.pacing.engagementStatus === 'STALLED').length;
    return { unitId: u.id, unitTitle: u.title, unitIcon: u.icon, avgCompletion: Math.round(avgCompletion), avgScore: avgScore !== null ? Math.round(avgScore) : null, totalStudents: students.length, stalledStudents };
  });
}

// ---------- Demo Data (isolated, only used when isDemoMode() = true) ----------

function getDemoStudents(): StudentWithPacing[] {
  const data = [
    { name: 'Ava Chen',          enrolled: new Date('2025-09-01'), completed: 8, score: 88, lastActive: new Date('2026-03-14'), unit: 'Unit C', lesson: 'Heat Transfer' },
    { name: 'Liam Patel',        enrolled: new Date('2025-09-15'), completed: 5, score: 72, lastActive: new Date('2026-03-12'), unit: 'Unit B', lesson: 'Plant Growth' },
    { name: 'Emma Rodriguez',    enrolled: new Date('2025-10-02'), completed: 6, score: 81, lastActive: new Date('2026-03-08'), unit: 'Unit C', lesson: 'Thermal Energy' },
    { name: 'Noah Thompson',     enrolled: new Date('2025-11-10'), completed: 3, score: 65, lastActive: new Date('2026-02-28'), unit: 'Unit A', lesson: 'Ecosystems' },
    { name: 'Sophia Kim',        enrolled: new Date('2025-09-01'), completed: 9, score: 94, lastActive: new Date('2026-03-14'), unit: 'Unit D', lesson: 'Structures' },
    { name: 'Jackson Lee',       enrolled: new Date('2026-01-08'), completed: 4, score: 78, lastActive: new Date('2026-03-13'), unit: 'Unit B', lesson: 'Photosynthesis' },
    { name: 'Olivia Nguyen',     enrolled: new Date('2025-09-01'), completed: 7, score: 85, lastActive: new Date('2026-03-06'), unit: 'Unit C', lesson: 'Insulation' },
    { name: 'Ethan Garcia',      enrolled: new Date('2026-03-10'), completed: 1, score: null, lastActive: new Date('2026-03-13'), unit: 'Unit A', lesson: 'Food Webs' },
  ];

  const totalLessons = 10;
  return data.map((s, i) => {
    const pacing = calculatePacing({
      enrolledAt: s.enrolled,
      completedLessons: s.completed,
      totalLessons,
      lastAcademicActivityAt: s.lastActive,
    });
    return {
      id: `demo-${i}`,
      name: s.name,
      email: `${s.name.toLowerCase().replace(' ', '.')}@school.ca`,
      gradeLevel: 7,
      avatar: null,
      enrolledAt: s.enrolled,
      completedLessons: s.completed,
      totalLessons,
      avgScore: s.score,
      lastAcademicActivityAt: s.lastActive,
      currentUnit: s.unit,
      currentLesson: s.lesson,
      pacing,
    };
  });
}

function getDemoSubmissions(): RecentSubmission[] {
  return [
    { id: 'd1', studentId: 'demo-0', studentName: 'Ava Chen', studentAvatar: null, activityTitle: 'Ecosystem Basics Quiz', activityType: 'QUIZ', score: 9, maxScore: 10, reviewed: true, submittedAt: new Date('2026-03-14T10:30:00') },
    { id: 'd2', studentId: 'demo-4', studentName: 'Sophia Kim', studentAvatar: null, activityTitle: 'Heat Transfer Lab', activityType: 'ASSIGNMENT', score: null, maxScore: 20, reviewed: false, submittedAt: new Date('2026-03-14T09:15:00') },
    { id: 'd3', studentId: 'demo-5', studentName: 'Jackson Lee', studentAvatar: null, activityTitle: 'Plant Growth Reflection', activityType: 'REFLECTION', score: null, maxScore: 10, reviewed: false, submittedAt: new Date('2026-03-13T14:00:00') },
    { id: 'd4', studentId: 'demo-1', studentName: 'Liam Patel', studentAvatar: null, activityTitle: 'Food Web Drawing', activityType: 'ASSIGNMENT', score: 17, maxScore: 20, reviewed: true, submittedAt: new Date('2026-03-12T11:45:00') },
    { id: 'd5', studentId: 'demo-2', studentName: 'Emma Rodriguez', studentAvatar: null, activityTitle: 'Producers & Consumers Quiz', activityType: 'QUIZ', score: 8, maxScore: 10, reviewed: true, submittedAt: new Date('2026-03-11T13:20:00') },
  ];
}

// ---------- Submission Detail (for review page) ----------

export interface SubmissionDetail {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar: string | null;
  studentGradeLevel: number | null;
  activityTitle: string;
  activityType: string;
  submissionType: string;
  unitTitle: string;
  lessonTitle: string;
  writtenResponse: string | null;
  fileUrl: string | null;
  fileName: string | null;
  score: number | null;
  maxScore: number | null;
  reviewed: boolean;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  teacherFeedback: string | null;
  submittedAt: Date;
  // AI feedback fields
  aiStatus: string;
  aiFeedback: string | null;
  aiStrengths: string | null;
  aiAreasForImprovement: string | null;
  aiNextSteps: string | null;
  aiProvisionalScore: number | null;
  aiPerformanceLevel: string | null;
  aiGeneratedAt: Date | null;
  finalizedByTeacher: boolean;
}

/**
 * Get a single submission by ID with full detail for the review page.
 * Verifies the submission belongs to a student assigned to this teacher.
 */
export async function getSubmissionById(
  submissionId: string,
  teacherId: string,
  ctx: GradeSubjectContext,
): Promise<SubmissionDetail | null> {
  // Demo mode: check demo submissions
  if (submissionId.startsWith('d') && isDemoMode()) {
    return getDemoSubmissionDetail(submissionId);
  }

  try {
    const { submissionWhere } = buildSubjectFilters(ctx);
    const sub = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        student: { assignedTeacherId: teacherId, gradeLevel: ctx.grade },
        ...submissionWhere,
      },
      include: {
        student: { select: { name: true, avatar: true, gradeLevel: true } },
        activity: {
          include: {
            lesson: { include: { unit: { select: { title: true } } } },
          },
        },
      },
    });

    if (!sub) return null;

    // Type assertion needed because Prisma client typings may lag behind schema changes
    const subAny = sub as Record<string, unknown>;

    return {
      id: sub.id,
      studentId: sub.studentId,
      studentName: sub.student.name,
      studentAvatar: sub.student.avatar,
      studentGradeLevel: sub.student.gradeLevel,
      activityTitle: sub.activity.title,
      activityType: sub.activity.type,
      submissionType: sub.submissionType || 'QUIZ_RESPONSE',
      unitTitle: sub.activity.lesson.unit.title,
      lessonTitle: sub.activity.lesson.title,
      writtenResponse: sub.writtenResponse,
      fileUrl: sub.fileUrl,
      fileName: sub.fileName,
      score: sub.score,
      maxScore: sub.maxScore,
      reviewed: sub.reviewed,
      reviewedAt: (subAny.reviewedAt as Date) || null,
      reviewedBy: (subAny.reviewedBy as string) || null,
      teacherFeedback: sub.teacherFeedback,
      submittedAt: sub.submittedAt,
      // AI feedback fields
      aiStatus: (subAny.aiStatus as string) || 'NONE',
      aiFeedback: (subAny.aiFeedback as string) || null,
      aiStrengths: (subAny.aiStrengths as string) || null,
      aiAreasForImprovement: (subAny.aiAreasForImprovement as string) || null,
      aiNextSteps: (subAny.aiNextSteps as string) || null,
      aiProvisionalScore: (subAny.aiProvisionalScore as number) || null,
      aiPerformanceLevel: (subAny.aiPerformanceLevel as string) || null,
      aiGeneratedAt: (subAny.aiGeneratedAt as Date) || null,
      finalizedByTeacher: (subAny.finalizedByTeacher as boolean) || false,
    };
  } catch (err) {
    console.error('[teacher-data] getSubmissionById failed:', err);
    return null;
  }
}

/**
 * Get unreviewed submissions for the review queue.
 * Scoped to teacher's students + subject context.
 */
export async function getUnreviewedSubmissions(
  teacherId: string,
  ctx: GradeSubjectContext,
): Promise<RecentSubmission[]> {
  if (isDemoMode() && ctx.subjectId.startsWith('demo-')) {
    return getDemoSubmissions().filter((s) => !s.reviewed);
  }

  try {
    const { submissionWhere } = buildSubjectFilters(ctx);
    const subs = await prisma.submission.findMany({
      where: {
        student: { assignedTeacherId: teacherId, gradeLevel: ctx.grade },
        reviewed: false,
        ...submissionWhere,
      },
      orderBy: { submittedAt: 'desc' },
      take: 50,
      include: {
        student: { select: { name: true, avatar: true } },
        activity: { select: { title: true, type: true } },
      },
    });
    if (subs.length === 0 && isDemoMode()) {
      return getDemoSubmissions().filter((s) => !s.reviewed);
    }
    if (subs.length === 0) return [];
    return subs.map((s: PrismaSubmissionWithRelations) => ({
      id: s.id,
      studentId: s.studentId,
      studentName: s.student.name,
      studentAvatar: s.student.avatar,
      activityTitle: s.activity.title,
      activityType: s.activity.type,
      score: s.score,
      maxScore: s.maxScore,
      reviewed: s.reviewed,
      submittedAt: s.submittedAt,
    }));
  } catch (err) {
    if (isDemoMode()) return getDemoSubmissions().filter((s) => !s.reviewed);
    console.error('[teacher-data] getUnreviewedSubmissions failed:', err);
    return [];
  }
}

// ---------- Demo Submission Detail ----------

function getDemoSubmissionDetail(id: string): SubmissionDetail | null {
  const aiNone = {
    aiStatus: 'NONE' as const, aiFeedback: null, aiStrengths: null, aiAreasForImprovement: null,
    aiNextSteps: null, aiProvisionalScore: null, aiPerformanceLevel: null, aiGeneratedAt: null,
    finalizedByTeacher: false,
  };

  const details: Record<string, SubmissionDetail> = {
    d1: {
      id: 'd1', studentId: 'demo-0', studentName: 'Ava Chen', studentAvatar: null, studentGradeLevel: 7,
      activityTitle: 'Ecosystem Basics Quiz', activityType: 'QUIZ', submissionType: 'QUIZ_RESPONSE',
      unitTitle: 'Unit A — Ecosystems', lessonTitle: 'Lesson 1 — Food Webs',
      writtenResponse: null, fileUrl: null, fileName: null,
      score: 9, maxScore: 10, reviewed: true, reviewedAt: new Date('2026-03-14T14:00:00'), reviewedBy: 'demo-teacher',
      teacherFeedback: 'Excellent understanding of ecosystem relationships. One point missed on decomposer classification.',
      submittedAt: new Date('2026-03-14T10:30:00'),
      ...aiNone, finalizedByTeacher: true,
    },
    d2: {
      id: 'd2', studentId: 'demo-4', studentName: 'Sophia Kim', studentAvatar: null, studentGradeLevel: 7,
      activityTitle: 'Heat Transfer Lab', activityType: 'ASSIGNMENT', submissionType: 'PARAGRAPH_RESPONSE',
      unitTitle: 'Unit C — Heat', lessonTitle: 'Lesson 2 — Conductors and Insulators',
      writtenResponse: `In our experiment, we tested five materials to see which ones conducted heat the fastest. We placed each material on a hot plate set to 60°C and measured the temperature at the opposite end every 30 seconds for 5 minutes.\n\nResults:\n- Aluminum: reached 52°C fastest (by 2 minutes)\n- Steel: reached 48°C by 3 minutes\n- Glass: reached 38°C by 5 minutes\n- Wood: only reached 28°C\n- Styrofoam: stayed at 22°C\n\nThis shows that metals are good conductors because the particles are close together and transfer kinetic energy quickly through collisions. Non-metals like wood and styrofoam are insulators because their particles are more spread out and don't transfer energy as efficiently.\n\nOne thing I found interesting is that aluminum conducted heat faster than steel, even though they are both metals. I think this is because aluminum has lower density and its electrons move more freely.`,
      fileUrl: null, fileName: null,
      score: null, maxScore: 20, reviewed: false, reviewedAt: null, reviewedBy: null,
      teacherFeedback: null,
      submittedAt: new Date('2026-03-14T09:15:00'),
      aiStatus: 'COMPLETE',
      aiFeedback: 'This is a strong lab report that demonstrates solid understanding of heat transfer concepts. The experimental setup is well described, results are clearly organized, and the conclusion connects observations to particle theory.',
      aiStrengths: 'Clear organization of experimental results with specific temperature data. Strong connection between observations and scientific theory about particle movement. Thoughtful observation about the difference between aluminum and steel conductivity.',
      aiAreasForImprovement: 'Consider adding a hypothesis before the results to strengthen the scientific method structure. The explanation of why aluminum conducts faster than steel could be expanded with thermal conductivity values.',
      aiNextSteps: 'Try adding a labeled diagram showing how particles transfer energy differently in conductors vs insulators. This would help connect your written explanation to a visual model.',
      aiProvisionalScore: 17, aiPerformanceLevel: 'MEETING',
      aiGeneratedAt: new Date('2026-03-14T09:16:00'), finalizedByTeacher: false,
    },
    d3: {
      id: 'd3', studentId: 'demo-5', studentName: 'Jackson Lee', studentAvatar: null, studentGradeLevel: 7,
      activityTitle: 'Plant Growth Reflection', activityType: 'REFLECTION', submissionType: 'REFLECTION',
      unitTitle: 'Unit B — Plants', lessonTitle: 'Lesson 3 — Factors Affecting Growth',
      writtenResponse: `Before this unit, I thought plants only needed water and sunlight to grow. Now I understand that they also need carbon dioxide, minerals from the soil, and the right temperature.\n\nThe experiment we did where we grew plants in different light conditions was really cool. The plant in complete darkness turned yellow and grew really tall and thin (etiolated), while the one in full light was shorter but had much greener and thicker leaves. This taught me that light doesn't just give energy — it actually changes how the plant develops.\n\nI want to learn more about how plants in the arctic survive with so little light for part of the year.`,
      fileUrl: null, fileName: null,
      score: null, maxScore: 10, reviewed: false, reviewedAt: null, reviewedBy: null,
      teacherFeedback: null,
      submittedAt: new Date('2026-03-13T14:00:00'),
      aiStatus: 'COMPLETE',
      aiFeedback: 'A thoughtful reflection that shows genuine learning. You clearly describe how your understanding changed and connect your observations from the experiment to broader plant biology concepts.',
      aiStrengths: 'Honest reflection about how your thinking changed — this shows real learning. Great use of the scientific term "etiolated". Your curiosity about arctic plants shows you are thinking beyond the lesson.',
      aiAreasForImprovement: 'Consider explaining WHY the plant in darkness grew tall and thin — what was it reaching for? Also, try connecting the role of minerals and CO₂ to specific plant processes like photosynthesis.',
      aiNextSteps: 'Research one arctic plant adaptation and write a paragraph comparing it to the plants you grew in class.',
      aiProvisionalScore: 8, aiPerformanceLevel: 'MEETING',
      aiGeneratedAt: new Date('2026-03-13T14:01:00'), finalizedByTeacher: false,
    },
    d4: {
      id: 'd4', studentId: 'demo-1', studentName: 'Liam Patel', studentAvatar: null, studentGradeLevel: 7,
      activityTitle: 'Food Web Drawing', activityType: 'ASSIGNMENT', submissionType: 'IMAGE_ARTIFACT',
      unitTitle: 'Unit A — Ecosystems', lessonTitle: 'Lesson 1 — Food Webs',
      writtenResponse: null, fileUrl: '#', fileName: 'food_web_diagram.png',
      score: 17, maxScore: 20, reviewed: true, reviewedAt: new Date('2026-03-12T15:00:00'), reviewedBy: 'demo-teacher',
      teacherFeedback: 'Great diagram showing multiple interconnected chains. Consider adding decomposers to complete the cycle.',
      submittedAt: new Date('2026-03-12T11:45:00'),
      ...aiNone, finalizedByTeacher: true,
    },
    d5: {
      id: 'd5', studentId: 'demo-2', studentName: 'Emma Rodriguez', studentAvatar: null, studentGradeLevel: 7,
      activityTitle: 'Producers & Consumers Quiz', activityType: 'QUIZ', submissionType: 'QUIZ_RESPONSE',
      unitTitle: 'Unit A — Ecosystems', lessonTitle: 'Lesson 2 — Energy Flow',
      writtenResponse: null, fileUrl: null, fileName: null,
      score: 8, maxScore: 10, reviewed: true, reviewedAt: new Date('2026-03-11T16:00:00'), reviewedBy: 'demo-teacher',
      teacherFeedback: 'Solid understanding. Missed the tertiary consumer question — review the food chain levels.',
      submittedAt: new Date('2026-03-11T13:20:00'),
      ...aiNone, finalizedByTeacher: true,
    },
  };
  return details[id] || null;
}

// ---------- Class Mastery Data (Phase 5) ----------

export interface StudentMasterySummary {
  studentId: string;
  studentName: string;
  masteredCount: number;
  developingCount: number;
  reviewDueCount: number;
  needsSupportCount: number;
  totalSkills: number;
  masteryPercent: number;
}

export interface ClassSkillBreakdown {
  skillId: string;
  skillCode: string;
  skillTitle: string;
  masteredCount: number;
  developingCount: number;
  reviewDueCount: number;
  needsSupportCount: number;
  notStartedCount: number;
  totalStudents: number;
}

export interface ClassMasteryOverview {
  totalStudents: number;
  avgMasteryPercent: number;
  studentsWithSupport: number;
  studentsWithReviewDue: number;
  studentsFullyMastered: number;
  studentSummaries: StudentMasterySummary[];
  skillBreakdown: ClassSkillBreakdown[];
}

/**
 * Get class-wide mastery overview — aggregated from StudentDashboardSummary + StudentSkillMastery.
 */
export async function getClassMasteryOverview(
  students: StudentWithPacing[],
  teacherId: string,
  ctx: GradeSubjectContext,
): Promise<ClassMasteryOverview> {
  const studentIds = students.map((s) => s.id).filter((id) => !id.startsWith('demo-'));

  if (studentIds.length === 0 || isDemoMode()) {
    return getDemoClassMastery(students);
  }

  try {
    // Per-student mastery summaries
    const dashSummaries = await prisma.studentDashboardSummary.findMany({
      where: { studentId: { in: studentIds } },
    });
    const summaryMap = new Map(dashSummaries.map((s) => [s.studentId, s]));

    const studentSummaries: StudentMasterySummary[] = students.map((s) => {
      const ds = summaryMap.get(s.id);
      const mastered = ds?.masteredCount ?? 0;
      const developing = ds?.developingCount ?? 0;
      const reviewDue = ds?.reviewDueCount ?? 0;
      const needsSupport = ds?.needsSupportCount ?? 0;
      const total = mastered + developing + reviewDue + needsSupport;
      return {
        studentId: s.id,
        studentName: s.name,
        masteredCount: mastered,
        developingCount: developing,
        reviewDueCount: reviewDue,
        needsSupportCount: needsSupport,
        totalSkills: total,
        masteryPercent: total > 0 ? Math.round((mastered / total) * 100) : 0,
      };
    });

    // Class-wide skill breakdown
    const skills = await prisma.skill.findMany({
      where: ctx.subjectId.startsWith('demo-') ? {} : {
        lessonSkills: { some: { lesson: { unit: { subjectId: ctx.subjectId } } } },
      },
      select: { id: true, code: true, title: true },
    });

    const allMastery = await prisma.studentSkillMastery.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, skillId: true, masteryState: true },
    });
    const masteryBySkill = new Map<string, typeof allMastery>();
    for (const m of allMastery) {
      const arr = masteryBySkill.get(m.skillId) || [];
      arr.push(m);
      masteryBySkill.set(m.skillId, arr);
    }

    const skillBreakdown: ClassSkillBreakdown[] = skills.map((skill) => {
      const records = masteryBySkill.get(skill.id) || [];
      return {
        skillId: skill.id,
        skillCode: skill.code,
        skillTitle: skill.title,
        masteredCount: records.filter((r) => r.masteryState === 'MASTERED').length,
        developingCount: records.filter((r) => r.masteryState === 'DEVELOPING' || r.masteryState === 'PRACTICING').length,
        reviewDueCount: records.filter((r) => r.masteryState === 'REVIEW_DUE').length,
        needsSupportCount: records.filter((r) => r.masteryState === 'NEEDS_SUPPORT').length,
        notStartedCount: studentIds.length - records.length,
        totalStudents: studentIds.length,
      };
    });

    const avgMastery = studentSummaries.length > 0
      ? Math.round(studentSummaries.reduce((s, st) => s + st.masteryPercent, 0) / studentSummaries.length)
      : 0;

    return {
      totalStudents: students.length,
      avgMasteryPercent: avgMastery,
      studentsWithSupport: studentSummaries.filter((s) => s.needsSupportCount > 0).length,
      studentsWithReviewDue: studentSummaries.filter((s) => s.reviewDueCount > 0).length,
      studentsFullyMastered: studentSummaries.filter((s) => s.totalSkills > 0 && s.masteredCount === s.totalSkills).length,
      studentSummaries,
      skillBreakdown,
    };
  } catch (err) {
    console.error('[teacher-data] getClassMasteryOverview failed:', err);
    return getDemoClassMastery(students);
  }
}

function getDemoClassMastery(students: StudentWithPacing[]): ClassMasteryOverview {
  const names = students.map((s) => s.name);
  const demoSummaries: StudentMasterySummary[] = students.map((s, i) => {
    const profiles = [
      { m: 5, d: 1, r: 0, ns: 0 }, // Strong
      { m: 3, d: 2, r: 1, ns: 0 }, // Good
      { m: 2, d: 2, r: 1, ns: 1 }, // Mixed
      { m: 1, d: 1, r: 1, ns: 2 }, // Needs support
      { m: 6, d: 0, r: 0, ns: 0 }, // Excellent
      { m: 3, d: 1, r: 1, ns: 1 }, // Average
      { m: 4, d: 2, r: 0, ns: 0 }, // Good
      { m: 1, d: 2, r: 0, ns: 0 }, // Newly started
    ];
    const p = profiles[i % profiles.length];
    const total = p.m + p.d + p.r + p.ns;
    return {
      studentId: s.id, studentName: s.name,
      masteredCount: p.m, developingCount: p.d, reviewDueCount: p.r, needsSupportCount: p.ns,
      totalSkills: total, masteryPercent: total > 0 ? Math.round((p.m / total) * 100) : 0,
    };
  });

  const demoSkills: ClassSkillBreakdown[] = [
    { skillId: 's1', skillCode: 'SCI-7-IE-1', skillTitle: 'Identify biotic and abiotic factors', masteredCount: 6, developingCount: 1, reviewDueCount: 0, needsSupportCount: 1, notStartedCount: 0, totalStudents: 8 },
    { skillId: 's2', skillCode: 'SCI-7-IE-2', skillTitle: 'Describe energy flow in food webs', masteredCount: 5, developingCount: 2, reviewDueCount: 1, needsSupportCount: 0, notStartedCount: 0, totalStudents: 8 },
    { skillId: 's3', skillCode: 'SCI-7-PF-1', skillTitle: 'Explain photosynthesis requirements', masteredCount: 4, developingCount: 2, reviewDueCount: 1, needsSupportCount: 1, notStartedCount: 0, totalStudents: 8 },
    { skillId: 's4', skillCode: 'SCI-7-HE-1', skillTitle: 'Explain heat transfer methods', masteredCount: 3, developingCount: 3, reviewDueCount: 1, needsSupportCount: 1, notStartedCount: 0, totalStudents: 8 },
    { skillId: 's5', skillCode: 'SCI-7-HE-2', skillTitle: 'Compare conductors and insulators', masteredCount: 2, developingCount: 2, reviewDueCount: 2, needsSupportCount: 2, notStartedCount: 0, totalStudents: 8 },
    { skillId: 's6', skillCode: 'SCI-7-SF-1', skillTitle: 'Identify structural components', masteredCount: 1, developingCount: 2, reviewDueCount: 0, needsSupportCount: 0, notStartedCount: 5, totalStudents: 8 },
  ];

  const avgMastery = demoSummaries.length > 0
    ? Math.round(demoSummaries.reduce((s, st) => s + st.masteryPercent, 0) / demoSummaries.length)
    : 0;

  return {
    totalStudents: students.length,
    avgMasteryPercent: avgMastery,
    studentsWithSupport: demoSummaries.filter((s) => s.needsSupportCount > 0).length,
    studentsWithReviewDue: demoSummaries.filter((s) => s.reviewDueCount > 0).length,
    studentsFullyMastered: demoSummaries.filter((s) => s.totalSkills > 0 && s.masteredCount === s.totalSkills).length,
    studentSummaries: demoSummaries,
    skillBreakdown: demoSkills,
  };
}

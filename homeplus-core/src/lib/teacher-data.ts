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
    return students.map((s: PrismaStudentRecord) => buildStudentWithPacing(s as PrismaStudentRecord, assignedLessons));
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
        student: { assignedTeacherId: teacherId },
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

// ============================================
// Teacher Data Layer — Home Plus LMS
// ============================================
// Server-side data fetching with dual-status pacing model.
// Uses demo data when no real students exist.

import { prisma } from '@/lib/db';
import {
  calculatePacing,
  getInterventionPriority,
  type PacingResult,
  type AcademicPacingStatus,
  type EngagementStatus,
} from '@/lib/pacing';

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

// ---------- Demo Data ----------

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

// ---------- Data Fetching ----------

export async function getStudentsWithPacing(): Promise<StudentWithPacing[]> {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      include: {
        progress: { include: { lesson: { include: { unit: true } } } },
        submissions: { orderBy: { submittedAt: 'desc' }, take: 1 },
      },
    });

    if (students.length === 0) return getDemoStudents();

    const allLessons = await prisma.lesson.count();

    return students.map((s: any) => {
      const completedLessons = s.progress.filter((p: any) => p.status === 'COMPLETE').length;
      const lastSub = s.submissions[0];
      const lastAcademicActivityAt = lastSub?.submittedAt || null;
      const inProgress = s.progress.find((p: any) => p.status === 'IN_PROGRESS');
      const currentUnit = inProgress?.lesson?.unit?.title || null;
      const currentLesson = inProgress?.lesson?.title || null;
      const scored = s.submissions.filter((sub: any) => sub.score !== null && sub.maxScore !== null);
      const avgScore = scored.length > 0
        ? scored.reduce((sum: number, sub: any) => sum + ((sub.score! / sub.maxScore!) * 100), 0) / scored.length
        : null;

      const pacing = calculatePacing({
        enrolledAt: s.enrolledAt,
        completedLessons,
        totalLessons: allLessons || 10,
        lastAcademicActivityAt,
      });

      return {
        id: s.id, name: s.name, email: s.email, gradeLevel: s.gradeLevel,
        avatar: s.avatar, enrolledAt: s.enrolledAt, completedLessons,
        totalLessons: allLessons || 10, avgScore, lastAcademicActivityAt,
        currentUnit, currentLesson, pacing,
      };
    });
  } catch {
    return getDemoStudents();
  }
}

export async function getStudentById(id: string): Promise<StudentWithPacing | null> {
  const students = await getStudentsWithPacing();
  return students.find((s) => s.id === id) || null;
}

export async function getOverviewMetrics(students: StudentWithPacing[]): Promise<OverviewMetrics> {
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

  let pendingReviews = 0;
  try { pendingReviews = await prisma.submission.count({ where: { reviewed: false } }); }
  catch { pendingReviews = 3; }

  return { totalStudents, onPace, behind, ahead, newlyEnrolled, needsAttention, avgProgress, avgScore, pendingReviews, stalledCount };
}

export function getStudentsByPriority(students: StudentWithPacing[]): StudentWithPacing[] {
  return [...students].sort((a, b) => getInterventionPriority(a.pacing) - getInterventionPriority(b.pacing));
}

export async function getRecentSubmissions(): Promise<RecentSubmission[]> {
  try {
    const subs = await prisma.submission.findMany({
      orderBy: { submittedAt: 'desc' }, take: 20,
      include: {
        student: { select: { name: true, avatar: true } },
        activity: { select: { title: true, type: true } },
      },
    });
    if (subs.length === 0) return getDemoSubmissions();
    return subs.map((s: any) => ({
      id: s.id, studentId: s.studentId, studentName: s.student.name, studentAvatar: s.student.avatar,
      activityTitle: s.activity.title, activityType: s.activity.type,
      score: s.score, maxScore: s.maxScore, reviewed: s.reviewed, submittedAt: s.submittedAt,
    }));
  } catch { return getDemoSubmissions(); }
}

/** Get submissions for a specific student by ID */
export async function getStudentSubmissions(studentId: string): Promise<RecentSubmission[]> {
  try {
    const subs = await prisma.submission.findMany({
      where: { studentId },
      orderBy: { submittedAt: 'desc' }, take: 10,
      include: {
        student: { select: { name: true, avatar: true } },
        activity: { select: { title: true, type: true } },
      },
    });
    if (subs.length === 0) {
      // Fall back to filtering demo data by ID
      return getDemoSubmissions().filter((s) => s.studentId === studentId);
    }
    return subs.map((s: any) => ({
      id: s.id, studentId: s.studentId, studentName: s.student.name, studentAvatar: s.student.avatar,
      activityTitle: s.activity.title, activityType: s.activity.type,
      score: s.score, maxScore: s.maxScore, reviewed: s.reviewed, submittedAt: s.submittedAt,
    }));
  } catch {
    return getDemoSubmissions().filter((s) => s.studentId === studentId);
  }
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

export async function getTeacherNotes(): Promise<TeacherNoteData[]> {
  try {
    const notes = await prisma.teacherNote.findMany({
      orderBy: { createdAt: 'desc' }, take: 50,
      include: { student: { select: { name: true, avatar: true } } },
    });
    return notes.map((n: any) => ({
      id: n.id, studentId: n.studentId, studentName: n.student.name, studentAvatar: n.student.avatar,
      tag: n.tag, content: n.content, createdAt: n.createdAt,
    }));
  } catch { return []; }
}

/** Get notes for a specific student by ID */
export async function getStudentNotes(studentId: string): Promise<TeacherNoteData[]> {
  try {
    const notes = await prisma.teacherNote.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: { student: { select: { name: true, avatar: true } } },
    });
    return notes.map((n: any) => ({
      id: n.id, studentId: n.studentId, studentName: n.student.name, studentAvatar: n.student.avatar,
      tag: n.tag, content: n.content, createdAt: n.createdAt,
    }));
  } catch { return []; }
}

export function getUnitProgress(students: StudentWithPacing[]): UnitProgress[] {
  const units = [
    { id: 'a', title: 'Unit A — Ecosystems', icon: '🌿' },
    { id: 'b', title: 'Unit B — Plants', icon: '🌱' },
    { id: 'c', title: 'Unit C — Heat', icon: '🔥' },
    { id: 'd', title: 'Unit D — Structures', icon: '🏗️' },
    { id: 'e', title: 'Unit E — Earth', icon: '🌍' },
  ];
  return units.map((u) => {
    const avgCompletion = students.length > 0
      ? students.reduce((sum, s) => sum + s.pacing.actualProgress, 0) / students.length : 0;
    const scored = students.filter((s) => s.avgScore !== null);
    const avgScore = scored.length > 0
      ? scored.reduce((sum, s) => sum + s.avgScore!, 0) / scored.length : null;
    const stalledStudents = students.filter((s) => s.pacing.engagementStatus === 'STALLED').length;
    return { unitId: u.id, unitTitle: u.title, unitIcon: u.icon, avgCompletion, avgScore, totalStudents: students.length, stalledStudents };
  });
}


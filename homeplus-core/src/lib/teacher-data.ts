// ============================================
// Teacher Data Layer — Home Plus LMS
// ============================================
// Server-side data fetching for teacher dashboard.
// Uses demo data when no real students exist yet.

import { prisma } from '@/lib/db';
import { calculatePacing, type PacingResult, type PacingStatus } from '@/lib/pacing';

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
  lastActivityDate: Date | null;
  currentUnit: string | null;
  currentLesson: string | null;
  pacing: PacingResult;
}

export interface OverviewMetrics {
  totalStudents: number;
  onPace: number;
  behind: number;
  ahead: number;
  stalled: number;
  newlyEnrolled: number;
  needsAttention: number;
  avgProgress: number;
  avgScore: number | null;
  pendingReviews: number;
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
  studentName: string;
  studentAvatar: string | null;
  tag: string;
  content: string;
  createdAt: Date;
}

// ---------- Demo data for empty states ----------

function getDemoStudents(): StudentWithPacing[] {
  const names = [
    { name: 'Ava Chen', enrolled: new Date('2025-09-01') },
    { name: 'Liam Patel', enrolled: new Date('2025-09-15') },
    { name: 'Emma Rodriguez', enrolled: new Date('2025-10-02') },
    { name: 'Noah Thompson', enrolled: new Date('2025-11-10') },
    { name: 'Sophia Kim', enrolled: new Date('2025-09-01') },
    { name: 'Jackson Lee', enrolled: new Date('2026-01-08') },
    { name: 'Olivia Nguyen', enrolled: new Date('2025-09-01') },
    { name: 'Ethan Garcia', enrolled: new Date('2026-03-10') },
  ];

  const totalLessons = 10;
  const completed = [8, 5, 6, 3, 9, 4, 7, 1];
  const scores = [88, 72, 81, 65, 94, 78, 85, null];
  const lastActive: (Date | null)[] = [
    new Date('2026-03-14'),
    new Date('2026-03-12'),
    new Date('2026-03-10'),
    new Date('2026-03-01'),
    new Date('2026-03-14'),
    new Date('2026-03-13'),
    new Date('2026-03-08'),
    new Date('2026-03-13'),
  ];
  const units = ['Unit C', 'Unit B', 'Unit C', 'Unit A', 'Unit D', 'Unit B', 'Unit C', 'Unit A'];
  const lessons = ['Heat Transfer', 'Plant Growth', 'Thermal Energy', 'Ecosystems', 'Structures', 'Photosynthesis', 'Insulation', 'Food Webs'];

  return names.map((s, i) => {
    const pacing = calculatePacing({
      enrolledAt: s.enrolled,
      completedLessons: completed[i],
      totalLessons,
      lastActivityDate: lastActive[i],
    });
    return {
      id: `demo-${i}`,
      name: s.name,
      email: `${s.name.toLowerCase().replace(' ', '.')}@school.ca`,
      gradeLevel: 7,
      avatar: null,
      enrolledAt: s.enrolled,
      completedLessons: completed[i],
      totalLessons,
      avgScore: scores[i],
      lastActivityDate: lastActive[i],
      currentUnit: units[i],
      currentLesson: lessons[i],
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

    if (students.length === 0) {
      return getDemoStudents();
    }

    const allLessons = await prisma.lesson.count();

    return students.map((s) => {
      const completedLessons = s.progress.filter((p) => p.status === 'COMPLETE').length;
      const lastSub = s.submissions[0];
      const lastActivity = lastSub?.submittedAt || null;

      // Find current unit/lesson (latest in-progress or first not started)
      const inProgress = s.progress.find((p) => p.status === 'IN_PROGRESS');
      const currentUnit = inProgress?.lesson?.unit?.title || null;
      const currentLesson = inProgress?.lesson?.title || null;

      // Average score from submissions
      const scored = s.submissions.filter((sub) => sub.score !== null && sub.maxScore !== null);
      const avgScore = scored.length > 0
        ? scored.reduce((sum, sub) => sum + ((sub.score! / sub.maxScore!) * 100), 0) / scored.length
        : null;

      const pacing = calculatePacing({
        enrolledAt: s.enrolledAt,
        completedLessons,
        totalLessons: allLessons || 10,
        lastActivityDate: lastActivity,
      });

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        gradeLevel: s.gradeLevel,
        avatar: s.avatar,
        enrolledAt: s.enrolledAt,
        completedLessons,
        totalLessons: allLessons || 10,
        avgScore,
        lastActivityDate: lastActivity,
        currentUnit,
        currentLesson,
        pacing,
      };
    });
  } catch {
    return getDemoStudents();
  }
}

export async function getOverviewMetrics(students: StudentWithPacing[]): Promise<OverviewMetrics> {
  const totalStudents = students.length;
  const onPace = students.filter((s) => s.pacing.status === 'ON_PACE').length;
  const behind = students.filter((s) =>
    s.pacing.status === 'SLIGHTLY_BEHIND' || s.pacing.status === 'SIGNIFICANTLY_BEHIND'
  ).length;
  const ahead = students.filter((s) => s.pacing.status === 'AHEAD').length;
  const stalled = students.filter((s) => s.pacing.status === 'STALLED').length;
  const newlyEnrolled = students.filter((s) => s.pacing.status === 'NEWLY_ENROLLED').length;
  const needsAttention = students.filter((s) =>
    s.pacing.status === 'SIGNIFICANTLY_BEHIND' || s.pacing.status === 'STALLED'
  ).length;

  const avgProgress = totalStudents > 0
    ? students.reduce((sum, s) => sum + s.pacing.actualProgress, 0) / totalStudents
    : 0;

  const scored = students.filter((s) => s.avgScore !== null);
  const avgScore = scored.length > 0
    ? scored.reduce((sum, s) => sum + s.avgScore!, 0) / scored.length
    : null;

  let pendingReviews = 0;
  try {
    pendingReviews = await prisma.submission.count({ where: { reviewed: false } });
  } catch {
    pendingReviews = 3; // demo
  }

  return { totalStudents, onPace, behind, ahead, stalled, newlyEnrolled, needsAttention, avgProgress, avgScore, pendingReviews };
}

export async function getRecentSubmissions(): Promise<RecentSubmission[]> {
  try {
    const subs = await prisma.submission.findMany({
      orderBy: { submittedAt: 'desc' },
      take: 20,
      include: {
        student: { select: { name: true, avatar: true } },
        activity: { select: { title: true, type: true } },
      },
    });

    if (subs.length === 0) {
      return getDemoSubmissions();
    }

    return subs.map((s) => ({
      id: s.id,
      studentName: s.student.name,
      studentAvatar: s.student.avatar,
      activityTitle: s.activity.title,
      activityType: s.activity.type,
      score: s.score,
      maxScore: s.maxScore,
      reviewed: s.reviewed,
      submittedAt: s.submittedAt,
    }));
  } catch {
    return getDemoSubmissions();
  }
}

function getDemoSubmissions(): RecentSubmission[] {
  return [
    { id: 'd1', studentName: 'Ava Chen', studentAvatar: null, activityTitle: 'Ecosystem Basics Quiz', activityType: 'QUIZ', score: 9, maxScore: 10, reviewed: true, submittedAt: new Date('2026-03-14T10:30:00') },
    { id: 'd2', studentName: 'Sophia Kim', studentAvatar: null, activityTitle: 'Heat Transfer Lab', activityType: 'ASSIGNMENT', score: null, maxScore: 20, reviewed: false, submittedAt: new Date('2026-03-14T09:15:00') },
    { id: 'd3', studentName: 'Jackson Lee', studentAvatar: null, activityTitle: 'Plant Growth Reflection', activityType: 'REFLECTION', score: null, maxScore: 10, reviewed: false, submittedAt: new Date('2026-03-13T14:00:00') },
    { id: 'd4', studentName: 'Liam Patel', studentAvatar: null, activityTitle: 'Food Web Drawing', activityType: 'ASSIGNMENT', score: 17, maxScore: 20, reviewed: true, submittedAt: new Date('2026-03-12T11:45:00') },
    { id: 'd5', studentName: 'Emma Rodriguez', studentAvatar: null, activityTitle: 'Producers & Consumers Quiz', activityType: 'QUIZ', score: 8, maxScore: 10, reviewed: true, submittedAt: new Date('2026-03-11T13:20:00') },
  ];
}

export async function getTeacherNotes(): Promise<TeacherNoteData[]> {
  try {
    const notes = await prisma.teacherNote.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        student: { select: { name: true, avatar: true } },
      },
    });
    return notes.map((n) => ({
      id: n.id,
      studentName: n.student.name,
      studentAvatar: n.student.avatar,
      tag: n.tag,
      content: n.content,
      createdAt: n.createdAt,
    }));
  } catch {
    return [];
  }
}

export function getUnitProgress(students: StudentWithPacing[]): UnitProgress[] {
  // Group by current unit — demo aggregation
  const unitMap = new Map<string, { students: StudentWithPacing[] }>();
  for (const s of students) {
    const unit = s.currentUnit || 'Unassigned';
    if (!unitMap.has(unit)) unitMap.set(unit, { students: [] });
    unitMap.get(unit)!.students.push(s);
  }

  const units = [
    { id: 'a', title: 'Unit A — Ecosystems', icon: '🌿' },
    { id: 'b', title: 'Unit B — Plants', icon: '🌱' },
    { id: 'c', title: 'Unit C — Heat', icon: '🔥' },
    { id: 'd', title: 'Unit D — Structures', icon: '🏗️' },
    { id: 'e', title: 'Unit E — Earth', icon: '🌍' },
  ];

  return units.map((u) => {
    const unitStudents = students; // All students for avg
    const avgCompletion = unitStudents.length > 0
      ? unitStudents.reduce((sum, s) => sum + s.pacing.actualProgress, 0) / unitStudents.length
      : 0;
    const scored = unitStudents.filter((s) => s.avgScore !== null);
    const avgScore = scored.length > 0
      ? scored.reduce((sum, s) => sum + s.avgScore!, 0) / scored.length
      : null;
    const stalledStudents = unitStudents.filter((s) => s.pacing.status === 'STALLED').length;
    return {
      unitId: u.id,
      unitTitle: u.title,
      unitIcon: u.icon,
      avgCompletion,
      avgScore,
      totalStudents: unitStudents.length,
      stalledStudents,
    };
  });
}

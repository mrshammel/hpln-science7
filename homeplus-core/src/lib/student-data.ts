// ============================================
// Student Data Layer — Home Plus LMS
// ============================================
// Server-side data fetching for the student dashboard.
// Queries real DB data when available, provides structured
// fallbacks when data is sparse.
//
// Data groups:
//   - studentProfile
//   - enrollments (subjects + units + lessons)
//   - courseProgress
//   - gradeSummaries
//   - pacingSummaries
//   - upcomingWork
//   - recentActivity
//   - feedbackSummaries

import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  calculatePacing,
  getAcademicPacingStyle,
  type PacingResult,
  type AcademicPacingStatus,
} from '@/lib/pacing';
import { isLessonDone } from '@/lib/lesson-progress';

// ============= Types =============

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  gradeLevel: number | null;
  avatar: string | null;
  enrolledAt: Date | null;
}

export interface CourseEnrollment {
  subjectId: string;
  subjectName: string;
  subjectIcon: string;
  gradeLevel: number;
  units: {
    id: string;
    title: string;
    icon: string | null;
    order: number;
    lessonCount: number;
  }[];
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  currentUnit: string | null;
  currentLesson: string | null;
  averageScore: number | null;
  gradeLabel: string;
  pacing: PacingResult;
  pacingStyle: { color: string; bg: string; icon: string };
  missingAssignments: number;
  latestReviewedItem: string | null;
}

export interface UpcomingItem {
  id: string;
  title: string;
  courseName: string;
  courseIcon: string;
  type: 'lesson' | 'assignment' | 'quiz';
  status: 'overdue' | 'due-today' | 'due-this-week' | 'upcoming';
  statusLabel: string;
  dueLabel: string;
}

export interface ActivityItem {
  id: string;
  description: string;
  detail: string;
  timestamp: Date;
  timeAgo: string;
  type: 'completed' | 'submitted' | 'reviewed' | 'started';
  dotColor: string;
}

export interface FeedbackItem {
  id: string;
  activityTitle: string;
  courseName: string;
  score: number | null;
  maxScore: number | null;
  teacherFeedback: string | null;
  aiFeedback: string | null;
  aiPerformanceLevel: string | null;
  reviewed: boolean;
  finalizedByTeacher: boolean;
  submittedAt: Date;
  reviewedAt: Date | null;
}

export interface StudentDashboardData {
  profile: StudentProfile;
  enrollments: CourseEnrollment[];
  upcoming: UpcomingItem[];
  recentActivity: ActivityItem[];
  feedback: FeedbackItem[];
  stats: {
    activeCourses: number;
    overallProgress: number;
    averageGrade: number | null;
    lessonsCompleted: number;
    totalLessons: number;
    assignmentsDue: number;
    feedbackAvailable: number;
  };
}

// ============= Main Loader =============

export async function getStudentDashboardData(): Promise<StudentDashboardData> {
  // Get authenticated student
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return getDemoDashboardData();
  }

  // Fetch student profile
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      gradeLevel: true,
      avatar: true,
      enrolledAt: true,
    },
  });

  if (!dbUser) {
    return getDemoDashboardData();
  }

  const profile: StudentProfile = {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    gradeLevel: dbUser.gradeLevel,
    avatar: dbUser.avatar,
    enrolledAt: dbUser.enrolledAt,
  };

  // Determine grade level for course lookup
  const grade = dbUser.gradeLevel || 7;

  // Fetch subjects for this grade level with full curriculum tree
  const subjects = await prisma.subject.findMany({
    where: { gradeLevel: grade, active: true },
    orderBy: { order: 'asc' },
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

  // Fetch all progress for this student
  const progressRecords = await prisma.studentProgress.findMany({
    where: { studentId: userId },
    select: {
      lessonId: true,
      status: true,
      completedAt: true,
    },
  });
  const progressMap = new Map(progressRecords.map((p) => [p.lessonId, p]));

  // Fetch all submissions for this student
  const submissions = await prisma.submission.findMany({
    where: { studentId: userId },
    orderBy: { submittedAt: 'desc' },
    include: {
      activity: {
        include: {
          lesson: {
            include: {
              unit: {
                include: { subject: true },
              },
            },
          },
        },
      },
    },
  });

  // Build enrollments
  const enrollments: CourseEnrollment[] = subjects.map((subject) => {
    const allLessons = subject.units.flatMap((u) => u.lessons);
    const totalLessons = allLessons.length;
    const completedLessons = allLessons.filter(
      (l) => isLessonDone(progressMap.get(l.id)?.status)
    ).length;
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Find current unit/lesson (first non-complete)
    let currentUnit: string | null = null;
    let currentLesson: string | null = null;
    for (const unit of subject.units) {
      for (const lesson of unit.lessons) {
        const status = progressMap.get(lesson.id)?.status;
        if (!isLessonDone(status)) {
          currentUnit = unit.title;
          currentLesson = lesson.title;
          break;
        }
      }
      if (currentLesson) break;
    }

    // Average score for this subject's submissions
    const subjectSubmissions = submissions.filter(
      (s) => s.activity.lesson.unit.subject.id === subject.id && s.score != null && s.maxScore != null && s.maxScore > 0
    );
    const averageScore = subjectSubmissions.length > 0
      ? Math.round(subjectSubmissions.reduce((sum, s) => sum + ((s.score! / s.maxScore!) * 100), 0) / subjectSubmissions.length)
      : null;

    // Grade label
    const gradeLabel = averageScore != null ? getGradeLabel(averageScore) : 'No grades yet';

    // Pacing
    const lastActivity = submissions
      .filter((s) => s.activity.lesson.unit.subject.id === subject.id)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())[0];
    const lastProgressDate = progressRecords
      .filter((p) => allLessons.some((l) => l.id === p.lessonId) && p.completedAt)
      .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))[0];
    const lastAcademicActivityAt = getLatestDate(
      lastActivity?.submittedAt ?? null,
      lastProgressDate?.completedAt ?? null
    );

    const pacing = calculatePacing({
      enrolledAt: dbUser.enrolledAt,
      completedLessons,
      totalLessons,
      lastAcademicActivityAt,
    });

    // Missing assignments (unsubmitted activities of type ASSIGNMENT)
    const allActivities = allLessons.flatMap((l) => l.activities);
    const assignmentActivities = allActivities.filter((a) => a.type === 'ASSIGNMENT');
    const submittedActivityIds = new Set(submissions.map((s) => s.activityId));
    const missingAssignments = assignmentActivities.filter((a) => !submittedActivityIds.has(a.id)).length;

    // Latest reviewed item
    const latestReviewed = (submissions as any[])
      .filter((s) => s.reviewed && s.activity.lesson.unit.subject.id === subject.id)
      .sort((a: any, b: any) => ((b.reviewedAt as Date)?.getTime() ?? 0) - ((a.reviewedAt as Date)?.getTime() ?? 0))[0];

    return {
      subjectId: subject.id,
      subjectName: subject.name,
      subjectIcon: subject.icon,
      gradeLevel: subject.gradeLevel,
      units: subject.units.map((u) => ({
        id: u.id,
        title: u.title,
        icon: u.icon,
        order: u.order,
        lessonCount: u.lessons.length,
      })),
      totalLessons,
      completedLessons,
      progressPercent,
      currentUnit,
      currentLesson,
      averageScore,
      gradeLabel,
      pacing,
      pacingStyle: getAcademicPacingStyle(pacing.academicStatus),
      missingAssignments,
      latestReviewedItem: latestReviewed
        ? latestReviewed.activity.title
        : null,
    };
  });

  // Build upcoming work
  const upcoming = buildUpcomingWork(enrollments);

  // Build recent activity from submissions + progress
  const recentActivity = buildRecentActivity(submissions, progressRecords);

  // Build feedback summary
  const feedback = buildFeedbackSummary(submissions);

  // Aggregate stats
  const totalLessons = enrollments.reduce((sum, e) => sum + e.totalLessons, 0);
  const lessonsCompleted = enrollments.reduce((sum, e) => sum + e.completedLessons, 0);
  const overallProgress = totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0;
  const scoredEnrollments = enrollments.filter((e) => e.averageScore != null);
  const averageGrade = scoredEnrollments.length > 0
    ? Math.round(scoredEnrollments.reduce((sum, e) => sum + e.averageScore!, 0) / scoredEnrollments.length)
    : null;

  return {
    profile,
    enrollments,
    upcoming,
    recentActivity,
    feedback,
    stats: {
      activeCourses: enrollments.length,
      overallProgress,
      averageGrade,
      lessonsCompleted,
      totalLessons,
      assignmentsDue: upcoming.filter((u) => u.status === 'overdue' || u.status === 'due-today' || u.status === 'due-this-week').length,
      feedbackAvailable: feedback.filter((f) => f.reviewed).length,
    },
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

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

// Build upcoming work from enrollment data
function buildUpcomingWork(enrollments: CourseEnrollment[]): UpcomingItem[] {
  const items: UpcomingItem[] = [];

  for (const course of enrollments) {
    if (course.currentLesson && course.currentUnit) {
      items.push({
        id: `next-${course.subjectId}`,
        title: course.currentLesson,
        courseName: course.subjectName,
        courseIcon: course.subjectIcon,
        type: 'lesson',
        status: 'upcoming',
        statusLabel: 'Next Lesson',
        dueLabel: course.currentUnit,
      });
    }

    if (course.missingAssignments > 0) {
      items.push({
        id: `missing-${course.subjectId}`,
        title: `${course.missingAssignments} missing assignment${course.missingAssignments > 1 ? 's' : ''}`,
        courseName: course.subjectName,
        courseIcon: course.subjectIcon,
        type: 'assignment',
        status: 'overdue',
        statusLabel: 'Missing',
        dueLabel: 'Submit when ready',
      });
    }
  }

  // Sort: overdue first, then due-today, due-this-week, upcoming
  const statusOrder: Record<string, number> = { overdue: 0, 'due-today': 1, 'due-this-week': 2, upcoming: 3 };
  items.sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99));

  return items;
}

// Build recent activity from submissions and progress
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRecentActivity(submissions: any[], progressRecords: any[]): ActivityItem[] {
  const items: ActivityItem[] = [];

  // Add submissions as activity items
  for (const sub of submissions.slice(0, 8)) {
    const courseName = sub.activity.lesson.unit.subject.name;
    if (sub.reviewed) {
      items.push({
        id: `review-${sub.id}`,
        description: `Teacher reviewed "${sub.activity.title}"`,
        detail: `${courseName} — ${sub.activity.lesson.unit.title}`,
        timestamp: sub.submittedAt,
        timeAgo: timeAgo(sub.submittedAt),
        type: 'reviewed',
        dotColor: '#f59e0b',
      });
    }
    items.push({
      id: `sub-${sub.id}`,
      description: `Submitted "${sub.activity.title}"`,
      detail: sub.score != null && sub.maxScore != null
        ? `${courseName} — Score: ${sub.score}/${sub.maxScore}`
        : courseName,
      timestamp: sub.submittedAt,
      timeAgo: timeAgo(sub.submittedAt),
      type: 'submitted',
      dotColor: '#3b82f6',
    });
  }

  // Sort by timestamp desc
  items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return items.slice(0, 8);
}

// Build feedback summary from submissions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildFeedbackSummary(submissions: any[]): FeedbackItem[] {
  return submissions
    .filter((s) => s.reviewed || s.aiFeedback)
    .slice(0, 5)
    .map((s) => ({
      id: s.id,
      activityTitle: s.activity.title,
      courseName: s.activity.lesson.unit.subject.name,
      score: s.score,
      maxScore: s.maxScore,
      teacherFeedback: s.teacherFeedback,
      aiFeedback: s.aiFeedback,
      aiPerformanceLevel: s.aiPerformanceLevel,
      reviewed: s.reviewed,
      finalizedByTeacher: s.finalizedByTeacher,
      submittedAt: s.submittedAt,
      reviewedAt: s.reviewedAt,
    }));
}

// ============= Demo Data =============

function getDemoDashboardData(): StudentDashboardData {
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000);

  const sciencePacing = calculatePacing({
    enrolledAt: daysAgo(120),
    completedLessons: 14,
    totalLessons: 24,
    lastAcademicActivityAt: hoursAgo(6),
  });
  const elaPacing = calculatePacing({
    enrolledAt: daysAgo(120),
    completedLessons: 8,
    totalLessons: 20,
    lastAcademicActivityAt: daysAgo(3),
  });
  const mathPacing = calculatePacing({
    enrolledAt: daysAgo(120),
    completedLessons: 18,
    totalLessons: 22,
    lastAcademicActivityAt: daysAgo(1),
  });

  return {
    profile: {
      id: 'demo-student',
      name: 'Student',
      email: 'student@example.com',
      gradeLevel: 7,
      avatar: null,
      enrolledAt: daysAgo(120),
    },
    enrollments: [
      {
        subjectId: 'sci-7',
        subjectName: 'Science',
        subjectIcon: '🔬',
        gradeLevel: 7,
        units: [
          { id: 'u1', title: 'Unit A — Ecosystems', icon: '🌿', order: 0, lessonCount: 6 },
          { id: 'u2', title: 'Unit B — Plants for Food', icon: '🌱', order: 1, lessonCount: 6 },
          { id: 'u3', title: 'Unit C — Heat', icon: '🌡️', order: 2, lessonCount: 6 },
          { id: 'u4', title: 'Unit D — Structures', icon: '🏗️', order: 3, lessonCount: 6 },
        ],
        totalLessons: 24,
        completedLessons: 14,
        progressPercent: 58,
        currentUnit: 'Unit C — Heat',
        currentLesson: 'Lesson 3 — Heat Transfer Methods',
        averageScore: 82,
        gradeLabel: 'Meeting',
        pacing: sciencePacing,
        pacingStyle: getAcademicPacingStyle(sciencePacing.academicStatus),
        missingAssignments: 1,
        latestReviewedItem: 'Ecosystem Food Web Drawing',
      },
      {
        subjectId: 'ela-7',
        subjectName: 'English Language Arts',
        subjectIcon: '📖',
        gradeLevel: 7,
        units: [
          { id: 'e1', title: 'Unit 1 — Identity & Voice', icon: '🗣️', order: 0, lessonCount: 5 },
          { id: 'e2', title: 'Unit 2 — Research & Inquiry', icon: '🔍', order: 1, lessonCount: 5 },
          { id: 'e3', title: 'Unit 3 — Persuasion', icon: '✍️', order: 2, lessonCount: 5 },
          { id: 'e4', title: 'Unit 4 — Literature Circles', icon: '📚', order: 3, lessonCount: 5 },
        ],
        totalLessons: 20,
        completedLessons: 8,
        progressPercent: 40,
        currentUnit: 'Unit 2 — Research & Inquiry',
        currentLesson: 'Lesson 4 — Source Evaluation',
        averageScore: 76,
        gradeLabel: 'Meeting',
        pacing: elaPacing,
        pacingStyle: getAcademicPacingStyle(elaPacing.academicStatus),
        missingAssignments: 2,
        latestReviewedItem: 'Personal Narrative Draft',
      },
      {
        subjectId: 'math-7',
        subjectName: 'Mathematics',
        subjectIcon: '🔢',
        gradeLevel: 7,
        units: [
          { id: 'm1', title: 'Unit 1 — Number Sense', icon: '🔢', order: 0, lessonCount: 5 },
          { id: 'm2', title: 'Unit 2 — Fractions & Decimals', icon: '📐', order: 1, lessonCount: 6 },
          { id: 'm3', title: 'Unit 3 — Patterns & Algebra', icon: '📊', order: 2, lessonCount: 5 },
          { id: 'm4', title: 'Unit 4 — Geometry', icon: '📏', order: 3, lessonCount: 6 },
        ],
        totalLessons: 22,
        completedLessons: 18,
        progressPercent: 82,
        currentUnit: 'Unit 4 — Geometry',
        currentLesson: 'Lesson 3 — Area and Perimeter',
        averageScore: 91,
        gradeLabel: 'Exceeding',
        pacing: mathPacing,
        pacingStyle: getAcademicPacingStyle(mathPacing.academicStatus),
        missingAssignments: 0,
        latestReviewedItem: 'Fraction Operations Quiz',
      },
    ],
    upcoming: [
      { id: 'u1', title: '2 missing assignments', courseName: 'English Language Arts', courseIcon: '📖', type: 'assignment', status: 'overdue', statusLabel: 'Missing', dueLabel: 'Submit when ready' },
      { id: 'u2', title: '1 missing assignment', courseName: 'Science', courseIcon: '🔬', type: 'assignment', status: 'overdue', statusLabel: 'Missing', dueLabel: 'Submit when ready' },
      { id: 'u3', title: 'Lesson 3 — Heat Transfer Methods', courseName: 'Science', courseIcon: '🔬', type: 'lesson', status: 'upcoming', statusLabel: 'Next Lesson', dueLabel: 'Unit C — Heat' },
      { id: 'u4', title: 'Lesson 4 — Source Evaluation', courseName: 'English Language Arts', courseIcon: '📖', type: 'lesson', status: 'upcoming', statusLabel: 'Next Lesson', dueLabel: 'Unit 2 — Research & Inquiry' },
      { id: 'u5', title: 'Lesson 3 — Area and Perimeter', courseName: 'Mathematics', courseIcon: '🔢', type: 'lesson', status: 'upcoming', statusLabel: 'Next Lesson', dueLabel: 'Unit 4 — Geometry' },
    ],
    recentActivity: [
      { id: 'a1', description: 'Completed "Lesson 2 — Conduction vs Convection"', detail: 'Science — Unit C Heat', timestamp: hoursAgo(6), timeAgo: '6h ago', type: 'completed', dotColor: '#22c55e' },
      { id: 'a2', description: 'Submitted "Fraction Operations Quiz"', detail: 'Mathematics — Score: 9/10', timestamp: daysAgo(1), timeAgo: 'Yesterday', type: 'submitted', dotColor: '#3b82f6' },
      { id: 'a3', description: 'Teacher reviewed "Ecosystem Food Web Drawing"', detail: 'Science — Feedback available', timestamp: daysAgo(2), timeAgo: '2 days ago', type: 'reviewed', dotColor: '#f59e0b' },
      { id: 'a4', description: 'Submitted "Personal Narrative Draft"', detail: 'English Language Arts', timestamp: daysAgo(3), timeAgo: '3 days ago', type: 'submitted', dotColor: '#3b82f6' },
      { id: 'a5', description: 'Completed "Lesson 5 — Equivalent Fractions"', detail: 'Mathematics — Unit 2', timestamp: daysAgo(4), timeAgo: '4 days ago', type: 'completed', dotColor: '#22c55e' },
    ],
    feedback: [
      { id: 'f1', activityTitle: 'Ecosystem Food Web Drawing', courseName: 'Science', score: 8, maxScore: 10, teacherFeedback: 'Great detail on the food web connections. Add one more decomposer example for full marks.', aiFeedback: null, aiPerformanceLevel: null, reviewed: true, finalizedByTeacher: true, submittedAt: daysAgo(5), reviewedAt: daysAgo(2) },
      { id: 'f2', activityTitle: 'Fraction Operations Quiz', courseName: 'Mathematics', score: 9, maxScore: 10, teacherFeedback: null, aiFeedback: 'Strong understanding of fraction addition and subtraction.', aiPerformanceLevel: 'MEETING', reviewed: false, finalizedByTeacher: false, submittedAt: daysAgo(1), reviewedAt: null },
      { id: 'f3', activityTitle: 'Personal Narrative Draft', courseName: 'English Language Arts', score: null, maxScore: null, teacherFeedback: null, aiFeedback: 'Good voice and personal connection. Consider adding more sensory details in paragraph 2.', aiPerformanceLevel: 'APPROACHING', reviewed: false, finalizedByTeacher: false, submittedAt: daysAgo(3), reviewedAt: null },
    ],
    stats: {
      activeCourses: 3,
      overallProgress: 61,
      averageGrade: 83,
      lessonsCompleted: 40,
      totalLessons: 66,
      assignmentsDue: 3,
      feedbackAvailable: 1,
    },
  };
}

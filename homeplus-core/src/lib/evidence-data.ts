// ============================================
// Evidence of Learning Data Layer — Home Plus LMS
// ============================================
// Teacher-scoped data access for student evidence, artifacts, and mastery.
// All functions accept (studentId, teacherId) for authorization.
// Demo data is isolated behind USE_DEMO — production errors surface cleanly.
//
// Key design decisions:
//   - assertTeacherCanAccessStudent() centralizes authorization
//   - Outcome mastery uses real evidence count (no take: 1 limit)
//   - Grade level derived from student, not hardcoded
//   - Unit progress scoped to student's assigned grade/subject
//   - Last academic event derived from max(submission, lesson completion)
//   - Safe submission type mapping via toSubmissionType()

import { prisma } from '@/lib/db';
import { truncateText } from '@/lib/helpers';

// ---------- Demo Mode ----------

const USE_DEMO = true; // Toggle false when real data is available

function isDemoMode(): boolean {
  return USE_DEMO;
}

// ---------- Types ----------

export type MasteryLevel = 'NOT_YET_ASSESSED' | 'EMERGING' | 'APPROACHING' | 'MEETING' | 'EXCEEDING';
export type SubmissionType = 'QUIZ_RESPONSE' | 'SHORT_ANSWER' | 'PARAGRAPH_RESPONSE' | 'ESSAY' | 'REFLECTION' | 'UPLOADED_WORKSHEET' | 'IMAGE_ARTIFACT' | 'PROJECT_FILE' | 'PORTFOLIO_EVIDENCE';

export interface WrittenResponse {
  id: string;
  title: string;
  submissionType: SubmissionType;
  unitLesson: string;
  writtenResponse: string;
  preview: string;
  score: number | null;
  maxScore: number | null;
  reviewed: boolean;
  teacherFeedback: string | null;
  submittedAt: Date;
}

export interface ArtifactSubmission {
  id: string;
  title: string;
  submissionType: SubmissionType;
  unitLesson: string;
  fileName: string;
  fileUrl: string;
  reviewed: boolean;
  submittedAt: Date;
}

export interface OutcomeMastery {
  outcomeId: string;
  outcomeCode: string;
  outcomeDescription: string;
  unitContext: string | null;
  masteryLevel: MasteryLevel;
  evidenceCount: number;
  latestEvidence: string | null;
  latestDate: Date | null;
  teacherNote: string | null;
}

export interface StudentUnitProgress {
  unitId: string;
  unitTitle: string;
  unitIcon: string;
  completedLessons: number;
  totalLessons: number;
  completionPct: number;
  avgScore: number | null;
}

export interface LastAcademicEvent {
  title: string;
  type: string;       // 'Quiz', 'Assignment', 'Reflection', etc.
  date: Date;
}

// ---------- Style Helpers ----------

export function getMasteryStyle(level: MasteryLevel): { color: string; bg: string; label: string } {
  const styles: Record<MasteryLevel, { color: string; bg: string; label: string }> = {
    NOT_YET_ASSESSED: { color: '#6b7280', bg: '#f3f4f6', label: 'Not Yet Assessed' },
    EMERGING:         { color: '#dc2626', bg: '#fee2e2', label: 'Emerging' },
    APPROACHING:      { color: '#d97706', bg: '#fef3c7', label: 'Approaching' },
    MEETING:          { color: '#059669', bg: '#d1fae5', label: 'Meeting' },
    EXCEEDING:        { color: '#2563eb', bg: '#dbeafe', label: 'Exceeding' },
  };
  return styles[level] || styles.NOT_YET_ASSESSED;
}

export function getSubmissionTypeLabel(type: SubmissionType): string {
  const labels: Record<SubmissionType, string> = {
    QUIZ_RESPONSE: 'Quiz Response',
    SHORT_ANSWER: 'Short Answer',
    PARAGRAPH_RESPONSE: 'Paragraph',
    ESSAY: 'Essay',
    REFLECTION: 'Reflection',
    UPLOADED_WORKSHEET: 'Worksheet',
    IMAGE_ARTIFACT: 'Image',
    PROJECT_FILE: 'Project File',
    PORTFOLIO_EVIDENCE: 'Portfolio',
  };
  return labels[type] || 'Submission';
}

// ---------- Safety Helpers ----------

/** Valid submission types — used for safe mapping from DB values */
const VALID_SUBMISSION_TYPES: Set<string> = new Set([
  'QUIZ_RESPONSE', 'SHORT_ANSWER', 'PARAGRAPH_RESPONSE', 'ESSAY', 'REFLECTION',
  'UPLOADED_WORKSHEET', 'IMAGE_ARTIFACT', 'PROJECT_FILE', 'PORTFOLIO_EVIDENCE',
]);

/** Safely map a database submission type to the SubmissionType union */
function toSubmissionType(dbValue: string | null, fallback: SubmissionType = 'QUIZ_RESPONSE'): SubmissionType {
  if (dbValue && VALID_SUBMISSION_TYPES.has(dbValue)) return dbValue as SubmissionType;
  return fallback;
}

/** Valid mastery levels — used for safe mapping from DB values */
const VALID_MASTERY_LEVELS: Set<string> = new Set([
  'NOT_YET_ASSESSED', 'EMERGING', 'APPROACHING', 'MEETING', 'EXCEEDING',
]);

/** Safely map a database mastery level to the MasteryLevel union */
function toMasteryLevel(dbValue: string | null): MasteryLevel {
  if (dbValue && VALID_MASTERY_LEVELS.has(dbValue)) return dbValue as MasteryLevel;
  return 'NOT_YET_ASSESSED';
}

// ---------- Teacher Authorization ----------

/**
 * Verify that a teacher is authorized to access a student's data.
 * Checks assignedTeacherId on the student record.
 * In demo mode, always returns true for demo-* IDs.
 */
async function assertTeacherCanAccessStudent(studentId: string, teacherId: string): Promise<boolean> {
  if (studentId.startsWith('demo-') && isDemoMode()) return true;

  try {
    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        role: 'STUDENT',
        assignedTeacherId: teacherId,
      },
      select: { id: true },
    });
    return student !== null;
  } catch {
    return false;
  }
}

/** Get a student's grade level for dynamic outcome/unit queries */
async function getStudentGradeLevel(studentId: string): Promise<number | null> {
  try {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { gradeLevel: true },
    });
    return student?.gradeLevel || null;
  } catch {
    return null;
  }
}

// ---------- Teacher-Scoped Data Fetching ----------

/**
 * Written responses — teacher-scoped.
 */
export async function getStudentWrittenResponses(studentId: string, teacherId: string): Promise<WrittenResponse[]> {
  if (studentId.startsWith('demo-') && isDemoMode()) {
    return getDemoWrittenResponsesById(studentId);
  }

  const authorized = await assertTeacherCanAccessStudent(studentId, teacherId);
  if (!authorized) return [];

  try {
    const subs = await prisma.submission.findMany({
      where: {
        studentId,
        writtenResponse: { not: null },
      },
      orderBy: { submittedAt: 'desc' },
      include: { activity: { include: { lesson: { include: { unit: true } } } } },
    });
    if (subs.length === 0) return [];
    return subs.map((s) => ({
      id: s.id,
      title: (s as any).activity.title,
      submissionType: toSubmissionType(s.submissionType, 'PARAGRAPH_RESPONSE'),
      unitLesson: `${(s as any).activity.lesson.unit.title} · ${(s as any).activity.lesson.title}`,
      writtenResponse: s.writtenResponse || '',
      preview: truncateText(s.writtenResponse || '', 120),
      score: s.score,
      maxScore: s.maxScore,
      reviewed: s.reviewed,
      teacherFeedback: s.teacherFeedback || null,
      submittedAt: s.submittedAt,
    }));
  } catch (err) {
    console.error('[evidence-data] getStudentWrittenResponses failed:', err);
    return [];
  }
}

/**
 * Uploaded artifacts — teacher-scoped.
 */
export async function getStudentArtifacts(studentId: string, teacherId: string): Promise<ArtifactSubmission[]> {
  if (studentId.startsWith('demo-') && isDemoMode()) {
    return getDemoArtifactsById(studentId);
  }

  const authorized = await assertTeacherCanAccessStudent(studentId, teacherId);
  if (!authorized) return [];

  try {
    const subs = await prisma.submission.findMany({
      where: {
        studentId,
        fileUrl: { not: null },
      },
      orderBy: { submittedAt: 'desc' },
      include: { activity: { include: { lesson: { include: { unit: true } } } } },
    });
    if (subs.length === 0) return [];
    return subs.map((s) => ({
      id: s.id,
      title: (s as any).activity.title,
      submissionType: toSubmissionType(s.submissionType, 'UPLOADED_WORKSHEET'),
      unitLesson: `${(s as any).activity.lesson.unit.title} · ${(s as any).activity.lesson.title}`,
      fileName: s.fileName || 'file',
      fileUrl: s.fileUrl || '#',
      reviewed: s.reviewed,
      submittedAt: s.submittedAt,
    }));
  } catch (err) {
    console.error('[evidence-data] getStudentArtifacts failed:', err);
    return [];
  }
}

/**
 * Outcome mastery — teacher-scoped, grade-dynamic, real evidence count.
 * Uses two separate queries:
 *   1. All mastery judgments (no take: 1) for real evidence count
 *   2. Latest judgment for current mastery level
 */
export async function getStudentOutcomeMastery(studentId: string, teacherId: string): Promise<OutcomeMastery[]> {
  if (studentId.startsWith('demo-') && isDemoMode()) {
    return getDemoOutcomeMasteryById(studentId);
  }

  const authorized = await assertTeacherCanAccessStudent(studentId, teacherId);
  if (!authorized) return [];

  try {
    // Derive grade from the student, not hardcoded
    const gradeLevel = await getStudentGradeLevel(studentId);
    if (!gradeLevel) return [];

    const outcomes = await prisma.learningOutcome.findMany({
      where: { gradeLevel },
      include: {
        masteryJudgments: {
          where: { studentId },
          orderBy: { assessedAt: 'desc' },
          // No take: 1 — we need real evidence count
          include: { submission: { select: { activity: { select: { title: true } } } } },
        },
      },
      orderBy: { code: 'asc' },
    });
    if (outcomes.length === 0) return [];

    return outcomes.map((o) => {
      const allJudgments = (o as any).masteryJudgments || [];
      const latest = allJudgments[0] || null;
      return {
        outcomeId: o.id,
        outcomeCode: o.code,
        outcomeDescription: o.description,
        unitContext: o.unitContext,
        masteryLevel: toMasteryLevel(latest?.masteryLevel || null),
        evidenceCount: allJudgments.length,  // Real count, not capped at 1
        latestEvidence: latest?.submission?.activity?.title || null,
        latestDate: latest?.assessedAt || null,
        teacherNote: latest?.teacherNote || null,
      };
    });
  } catch (err) {
    console.error('[evidence-data] getStudentOutcomeMastery failed:', err);
    return [];
  }
}

/**
 * Unit progress — teacher-scoped, assigned-path only.
 * Scoped to the student's grade + active subjects, not the global catalog.
 */
export async function getStudentUnitProgress(studentId: string, teacherId: string): Promise<StudentUnitProgress[]> {
  if (studentId.startsWith('demo-') && isDemoMode()) {
    return getDemoUnitProgressById(studentId);
  }

  const authorized = await assertTeacherCanAccessStudent(studentId, teacherId);
  if (!authorized) return [];

  try {
    // Derive grade from the student for assigned-path scoping
    const gradeLevel = await getStudentGradeLevel(studentId);

    const units = await prisma.unit.findMany({
      where: gradeLevel
        ? { subject: { gradeLevel, active: true } }
        : { subject: { active: true } },
      include: {
        lessons: {
          include: {
            progress: { where: { studentId } },
            activities: { include: { submissions: { where: { studentId } } } },
          },
        },
      },
      orderBy: { order: 'asc' },
    });
    if (units.length === 0) return [];

    return units.map((u) => {
      const totalLessons = u.lessons.length;
      const completedLessons = u.lessons.filter((l) =>
        l.progress.some((p) => p.status === 'COMPLETE')
      ).length;
      const allSubs = u.lessons.flatMap((l) => l.activities.flatMap((a) => a.submissions));
      const scored = allSubs.filter((s) => s.score !== null && s.maxScore !== null);
      const avgScore = scored.length > 0
        ? scored.reduce((sum, s) => sum + ((s.score! / s.maxScore!) * 100), 0) / scored.length
        : null;
      return {
        unitId: u.id,
        unitTitle: u.title,
        unitIcon: u.icon || '📘',
        completedLessons,
        totalLessons,
        completionPct: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        avgScore: avgScore !== null ? Math.round(avgScore) : null,
      };
    });
  } catch (err) {
    console.error('[evidence-data] getStudentUnitProgress failed:', err);
    return [];
  }
}

/**
 * Last academic event — teacher-scoped, from all meaningful activity.
 * Checks both submissions and lesson completions, matching the pacing engine's
 * definition of meaningful academic activity.
 */
export async function getLastAcademicEvent(studentId: string, teacherId: string): Promise<LastAcademicEvent | null> {
  if (studentId.startsWith('demo-') && isDemoMode()) {
    return getDemoLastEventById(studentId);
  }

  const authorized = await assertTeacherCanAccessStudent(studentId, teacherId);
  if (!authorized) return null;

  try {
    // Source 1: latest submission
    const latestSub = await prisma.submission.findFirst({
      where: { studentId },
      orderBy: { submittedAt: 'desc' },
      include: { activity: { select: { title: true, type: true } } },
    });

    // Source 2: latest lesson completion
    const latestCompletion = await prisma.studentProgress.findFirst({
      where: { studentId, status: 'COMPLETE', completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      include: { lesson: { select: { title: true } } },
    });

    // Pick the most recent of the two
    const subDate = latestSub?.submittedAt || null;
    const compDate = latestCompletion?.completedAt || null;

    const activityTypeLabels: Record<string, string> = {
      QUIZ: 'Quiz', ASSIGNMENT: 'Assignment', REFLECTION: 'Reflection', ACTIVITY: 'Activity',
    };

    if (subDate && compDate) {
      if (subDate >= compDate) {
        return {
          title: (latestSub as any).activity.title,
          type: activityTypeLabels[(latestSub as any).activity.type] || (latestSub as any).activity.type,
          date: subDate,
        };
      } else {
        return {
          title: (latestCompletion as any).lesson.title,
          type: 'Lesson Completion',
          date: compDate,
        };
      }
    } else if (subDate) {
      return {
        title: (latestSub as any).activity.title,
        type: activityTypeLabels[(latestSub as any).activity.type] || (latestSub as any).activity.type,
        date: subDate,
      };
    } else if (compDate) {
      return {
        title: (latestCompletion as any).lesson.title,
        type: 'Lesson Completion',
        date: compDate,
      };
    }

    return null;
  } catch (err) {
    console.error('[evidence-data] getLastAcademicEvent failed:', err);
    return null;
  }
}

// ---------- Demo Data (isolated, only used when USE_DEMO = true) ----------

const demoWrittenResponses: Record<string, WrittenResponse[]> = {
  'demo-0': [ // Ava Chen
    { id: 'wr-a1', title: 'Thermal Conductors vs Insulators', submissionType: 'PARAGRAPH_RESPONSE', unitLesson: 'Unit C · Lesson 2', writtenResponse: 'Conductors allow heat to pass through them easily, like metals. Insulators resist heat flow, like wood and plastic. A metal spoon in hot soup gets warm quickly because metal is a good conductor. A wooden spoon stays cool because wood is an insulator. This is why pot handles are often made of plastic or wood.', preview: '', score: 9, maxScore: 10, reviewed: true, teacherFeedback: 'Excellent real-world examples!', submittedAt: new Date('2026-03-13') },
    { id: 'wr-a2', title: 'Predator-Prey Population Analysis', submissionType: 'ESSAY', unitLesson: 'Unit A · Lesson 3', writtenResponse: 'When we looked at the lynx and hare population data, I noticed that the predator population always lags behind the prey population. When hares are plentiful, lynx populations grow because there is plenty of food. But as more lynx eat more hares, the hare population shrinks. Then lynx start to decline because of food scarcity. It takes time for both populations to recover, which is why the graph shows repeating cycles.', preview: '', score: 14, maxScore: 15, reviewed: true, teacherFeedback: null, submittedAt: new Date('2026-03-10') },
  ],
  'demo-1': [ // Liam Patel
    { id: 'wr-l1', title: 'Ecosystem Food Web Explanation', submissionType: 'PARAGRAPH_RESPONSE', unitLesson: 'Unit A · Lesson 1', writtenResponse: 'A food web shows how energy flows through an ecosystem. Unlike a food chain that shows a single path, a food web shows all the interconnected feeding relationships. Producers like plants are at the base because they make their own energy through photosynthesis. Primary consumers eat the producers, and secondary consumers eat the primary consumers. Decomposers break down dead matter and return nutrients to the soil, completing the cycle.', preview: '', score: 8, maxScore: 10, reviewed: true, teacherFeedback: 'Great explanation of energy flow! Consider adding an example.', submittedAt: new Date('2026-03-12') },
    { id: 'wr-l2', title: 'Plant Adaptation Reflection', submissionType: 'REFLECTION', unitLesson: 'Unit B · Lesson 2', writtenResponse: 'I learned that plants have amazing ways to survive. Cacti store water in their stems and have spines instead of leaves to reduce water loss. I never realized that the shape of a leaf could help a plant survive in different environments.', preview: '', score: 9, maxScore: 10, reviewed: true, teacherFeedback: 'Wonderful reflection! You connected your learning to real examples.', submittedAt: new Date('2026-03-10') },
    { id: 'wr-l3', title: 'Predator-Prey Relationship', submissionType: 'SHORT_ANSWER', unitLesson: 'Unit A · Lesson 2', writtenResponse: 'When the prey population decreases, predators have less food and their population also decreases. Then the prey can recover because there are fewer predators.', preview: '', score: 5, maxScore: 5, reviewed: true, teacherFeedback: null, submittedAt: new Date('2026-03-08') },
  ],
  'demo-2': [ // Emma Rodriguez
    { id: 'wr-e1', title: 'Heat Transfer Comparison', submissionType: 'ESSAY', unitLesson: 'Unit C · Lesson 1', writtenResponse: 'Conduction, convection, and radiation are the three methods of heat transfer. Conduction happens when heat moves through direct contact between particles, like when a metal spoon gets hot in soup. Convection occurs in fluids when warmer particles rise and cooler particles sink, creating a current. This is why the top floor of a building is usually warmer. Radiation transfers heat through electromagnetic waves without needing a medium. The sun warms the Earth through radiation across space.', preview: '', score: null, maxScore: 15, reviewed: false, teacherFeedback: null, submittedAt: new Date('2026-03-08') },
  ],
  'demo-3': [ // Noah Thompson
    { id: 'wr-n1', title: 'Food Chain Description', submissionType: 'SHORT_ANSWER', unitLesson: 'Unit A · Lesson 1', writtenResponse: 'A food chain shows one path of energy from a producer to a consumer. Grass is eaten by a rabbit which is eaten by a fox.', preview: '', score: 3, maxScore: 5, reviewed: true, teacherFeedback: 'Try to include more detail about energy transfer.', submittedAt: new Date('2026-02-28') },
  ],
};

const demoArtifacts: Record<string, ArtifactSubmission[]> = {
  'demo-0': [
    { id: 'art-a1', title: 'Heat Transfer Diagram', submissionType: 'IMAGE_ARTIFACT', unitLesson: 'Unit C · Lesson 1', fileName: 'heat_transfer_diagram.png', fileUrl: '#', reviewed: true, submittedAt: new Date('2026-03-12') },
  ],
  'demo-1': [
    { id: 'art-l1', title: 'Ecosystem Diagram', submissionType: 'IMAGE_ARTIFACT', unitLesson: 'Unit A · Lesson 1', fileName: 'ecosystem_diagram.png', fileUrl: '#', reviewed: true, submittedAt: new Date('2026-03-11') },
    { id: 'art-l2', title: 'Plant Growth Data Collection', submissionType: 'PROJECT_FILE', unitLesson: 'Unit B · Lesson 1', fileName: 'plant_growth_data.xlsx', fileUrl: '#', reviewed: true, submittedAt: new Date('2026-03-07') },
  ],
  'demo-2': [
    { id: 'art-e1', title: 'Heat Experiment Worksheet', submissionType: 'UPLOADED_WORKSHEET', unitLesson: 'Unit C · Lesson 2', fileName: 'heat_experiment.pdf', fileUrl: '#', reviewed: false, submittedAt: new Date('2026-03-06') },
  ],
};

const demoOutcomeMastery: Record<string, OutcomeMastery[]> = {
  'demo-0': [
    { outcomeId: 'o1', outcomeCode: 'SCI.7.A.1', outcomeDescription: 'Investigate and describe relationships between organisms in an ecosystem', unitContext: 'Unit A — Ecosystems', masteryLevel: 'MEETING', evidenceCount: 2, latestEvidence: 'Predator-Prey Population Analysis', latestDate: new Date('2026-03-10'), teacherNote: null },
    { outcomeId: 'o3', outcomeCode: 'SCI.7.C.1', outcomeDescription: 'Describe heat as a form of energy and identify methods of heat transfer', unitContext: 'Unit C — Heat', masteryLevel: 'EXCEEDING', evidenceCount: 2, latestEvidence: 'Thermal Conductors vs Insulators', latestDate: new Date('2026-03-13'), teacherNote: 'Exceptional understanding' },
  ],
  'demo-1': [
    { outcomeId: 'o1', outcomeCode: 'SCI.7.A.1', outcomeDescription: 'Investigate and describe relationships between organisms in an ecosystem', unitContext: 'Unit A — Ecosystems', masteryLevel: 'MEETING', evidenceCount: 3, latestEvidence: 'Ecosystem Food Web Explanation', latestDate: new Date('2026-03-12'), teacherNote: 'Strong understanding demonstrated' },
    { outcomeId: 'o2', outcomeCode: 'SCI.7.A.2', outcomeDescription: 'Identify examples of predator-prey and symbiotic relationships', unitContext: 'Unit A — Ecosystems', masteryLevel: 'APPROACHING', evidenceCount: 2, latestEvidence: 'Predator-Prey Relationship', latestDate: new Date('2026-03-08'), teacherNote: 'Needs more depth on symbiotic types' },
    { outcomeId: 'o3', outcomeCode: 'SCI.7.B.1', outcomeDescription: 'Describe the conditions and processes needed for plant growth', unitContext: 'Unit B — Plants', masteryLevel: 'MEETING', evidenceCount: 2, latestEvidence: 'Plant Growth Data Collection', latestDate: new Date('2026-03-07'), teacherNote: null },
    { outcomeId: 'o4', outcomeCode: 'SCI.7.B.2', outcomeDescription: 'Examine plant adaptations to different environments', unitContext: 'Unit B — Plants', masteryLevel: 'EXCEEDING', evidenceCount: 1, latestEvidence: 'Plant Adaptation Reflection', latestDate: new Date('2026-03-10'), teacherNote: 'Exceptional connections made' },
    { outcomeId: 'o5', outcomeCode: 'SCI.7.C.1', outcomeDescription: 'Describe heat as a form of energy and identify methods of heat transfer', unitContext: 'Unit C — Heat', masteryLevel: 'NOT_YET_ASSESSED', evidenceCount: 0, latestEvidence: null, latestDate: null, teacherNote: null },
    { outcomeId: 'o6', outcomeCode: 'SCI.7.D.1', outcomeDescription: 'Describe structures that are built to withstand loads and forces', unitContext: 'Unit D — Structures', masteryLevel: 'NOT_YET_ASSESSED', evidenceCount: 0, latestEvidence: null, latestDate: null, teacherNote: null },
    { outcomeId: 'o7', outcomeCode: 'SCI.7.E.1', outcomeDescription: 'Investigate the structure of the Earth and its landforms', unitContext: 'Unit E — Earth', masteryLevel: 'NOT_YET_ASSESSED', evidenceCount: 0, latestEvidence: null, latestDate: null, teacherNote: null },
  ],
  'demo-2': [
    { outcomeId: 'o5', outcomeCode: 'SCI.7.C.1', outcomeDescription: 'Describe heat as a form of energy and identify methods of heat transfer', unitContext: 'Unit C — Heat', masteryLevel: 'NOT_YET_ASSESSED', evidenceCount: 1, latestEvidence: 'Heat Transfer Comparison', latestDate: new Date('2026-03-08'), teacherNote: null },
  ],
  'demo-3': [
    { outcomeId: 'o1', outcomeCode: 'SCI.7.A.1', outcomeDescription: 'Investigate and describe relationships between organisms in an ecosystem', unitContext: 'Unit A — Ecosystems', masteryLevel: 'EMERGING', evidenceCount: 1, latestEvidence: 'Food Chain Description', latestDate: new Date('2026-02-28'), teacherNote: 'Needs more depth' },
  ],
};

const demoUnitProgress: Record<string, StudentUnitProgress[]> = {
  'demo-0': [
    { unitId: 'a', unitTitle: 'Unit A — Ecosystems', unitIcon: '🌿', completedLessons: 3, totalLessons: 3, completionPct: 100, avgScore: 90 },
    { unitId: 'b', unitTitle: 'Unit B — Plants', unitIcon: '🌱', completedLessons: 2, totalLessons: 2, completionPct: 100, avgScore: 85 },
    { unitId: 'c', unitTitle: 'Unit C — Heat', unitIcon: '🔥', completedLessons: 3, totalLessons: 3, completionPct: 100, avgScore: 91 },
    { unitId: 'd', unitTitle: 'Unit D — Structures', unitIcon: '🏗️', completedLessons: 0, totalLessons: 1, completionPct: 0, avgScore: null },
    { unitId: 'e', unitTitle: 'Unit E — Earth', unitIcon: '🌍', completedLessons: 0, totalLessons: 1, completionPct: 0, avgScore: null },
  ],
  'demo-1': [
    { unitId: 'a', unitTitle: 'Unit A — Ecosystems', unitIcon: '🌿', completedLessons: 3, totalLessons: 3, completionPct: 100, avgScore: 76 },
    { unitId: 'b', unitTitle: 'Unit B — Plants', unitIcon: '🌱', completedLessons: 2, totalLessons: 2, completionPct: 100, avgScore: 80 },
    { unitId: 'c', unitTitle: 'Unit C — Heat', unitIcon: '🔥', completedLessons: 0, totalLessons: 3, completionPct: 0, avgScore: null },
    { unitId: 'd', unitTitle: 'Unit D — Structures', unitIcon: '🏗️', completedLessons: 0, totalLessons: 1, completionPct: 0, avgScore: null },
    { unitId: 'e', unitTitle: 'Unit E — Earth', unitIcon: '🌍', completedLessons: 0, totalLessons: 1, completionPct: 0, avgScore: null },
  ],
  'demo-2': [
    { unitId: 'a', unitTitle: 'Unit A — Ecosystems', unitIcon: '🌿', completedLessons: 3, totalLessons: 3, completionPct: 100, avgScore: 82 },
    { unitId: 'b', unitTitle: 'Unit B — Plants', unitIcon: '🌱', completedLessons: 2, totalLessons: 2, completionPct: 100, avgScore: 78 },
    { unitId: 'c', unitTitle: 'Unit C — Heat', unitIcon: '🔥', completedLessons: 1, totalLessons: 3, completionPct: 33, avgScore: null },
    { unitId: 'd', unitTitle: 'Unit D — Structures', unitIcon: '🏗️', completedLessons: 0, totalLessons: 1, completionPct: 0, avgScore: null },
    { unitId: 'e', unitTitle: 'Unit E — Earth', unitIcon: '🌍', completedLessons: 0, totalLessons: 1, completionPct: 0, avgScore: null },
  ],
  'demo-3': [
    { unitId: 'a', unitTitle: 'Unit A — Ecosystems', unitIcon: '🌿', completedLessons: 2, totalLessons: 3, completionPct: 67, avgScore: 60 },
    { unitId: 'b', unitTitle: 'Unit B — Plants', unitIcon: '🌱', completedLessons: 1, totalLessons: 2, completionPct: 50, avgScore: 65 },
    { unitId: 'c', unitTitle: 'Unit C — Heat', unitIcon: '🔥', completedLessons: 0, totalLessons: 3, completionPct: 0, avgScore: null },
    { unitId: 'd', unitTitle: 'Unit D — Structures', unitIcon: '🏗️', completedLessons: 0, totalLessons: 1, completionPct: 0, avgScore: null },
    { unitId: 'e', unitTitle: 'Unit E — Earth', unitIcon: '🌍', completedLessons: 0, totalLessons: 1, completionPct: 0, avgScore: null },
  ],
};

const demoLastAcademicEvents: Record<string, LastAcademicEvent> = {
  'demo-0': { title: 'Thermal Conductors vs Insulators', type: 'Paragraph Response', date: new Date('2026-03-13') },
  'demo-1': { title: 'Ecosystem Food Web Explanation', type: 'Paragraph Response', date: new Date('2026-03-12') },
  'demo-2': { title: 'Heat Transfer Comparison', type: 'Essay', date: new Date('2026-03-08') },
  'demo-3': { title: 'Food Chain Description', type: 'Short Answer', date: new Date('2026-02-28') },
  'demo-4': { title: 'Structures Quiz', type: 'Quiz', date: new Date('2026-03-14') },
  'demo-5': { title: 'Photosynthesis Lab', type: 'Assignment', date: new Date('2026-03-13') },
  'demo-6': { title: 'Insulation Experiment', type: 'Assignment', date: new Date('2026-03-06') },
  'demo-7': { title: 'Food Webs Introduction', type: 'Quiz', date: new Date('2026-03-13') },
};

// ---------- Demo Fallbacks (by ID) ----------

function getDemoWrittenResponsesById(studentId: string): WrittenResponse[] {
  const responses = demoWrittenResponses[studentId] || [];
  return responses.map((r) => ({ ...r, preview: truncateText(r.writtenResponse, 120) }));
}

function getDemoArtifactsById(studentId: string): ArtifactSubmission[] {
  return demoArtifacts[studentId] || [];
}

function getDemoOutcomeMasteryById(studentId: string): OutcomeMastery[] {
  return demoOutcomeMastery[studentId] || demoOutcomeMastery['demo-1'] || [];
}

function getDemoUnitProgressById(studentId: string): StudentUnitProgress[] {
  return demoUnitProgress[studentId] || demoUnitProgress['demo-1'] || [];
}

function getDemoLastEventById(studentId: string): LastAcademicEvent | null {
  return demoLastAcademicEvents[studentId] || null;
}

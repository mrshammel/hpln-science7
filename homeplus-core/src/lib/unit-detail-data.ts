// ============================================
// Student Unit Detail — Data Helper
// ============================================
// Fetches a single unit with lessons, activities, and progress
// for the /student/courses/[courseId]/units/[unitId] page.
//
// Subject-aware lesson gating:
//   Uses lesson-progress.ts helpers to compute lock state
//   per subject mode (Science strict mastery, others COMPLETE/MASTERED).

import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { resolveSubjectMode, type SubjectMode } from '@/lib/lesson-types';
import {
  isLessonDone,
  isLessonUnlocked,
  getLessonDisplayState,
  resolveNextLesson,
  type LessonDisplayState,
  type LessonForResolver,
} from '@/lib/lesson-progress';

// ============= Types =============

export interface LessonItem {
  id: string;
  title: string;
  subtitle: string | null;
  order: number;
  /** Persisted DB status */
  status: string;
  /** Computed display state (includes LOCKED/AVAILABLE) */
  displayState: LessonDisplayState;
  completedAt: Date | null;
  masteryScore: number | null;
  activityCount: number;
  completedActivities: number;
  isNextLesson: boolean;
  activities: {
    id: string;
    type: string;
    title: string;
    points: number;
    submitted: boolean;
    score: number | null;
    maxScore: number | null;
  }[];
}

export interface UnitPageData {
  courseId: string;
  courseName: string;
  courseIcon: string;
  gradeLevel: number;
  subjectMode: SubjectMode;
  unitId: string;
  unitTitle: string;
  unitDescription: string | null;
  unitIcon: string | null;
  unitOrder: number;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  unitStatus: 'not-started' | 'in-progress' | 'completed';
  nextLessonId: string | null;
  nextLessonTitle: string | null;
  lessons: LessonItem[];
  // Instructional framing
  learningTargets: string[];
  successCriteria: string[];
  keyVocabulary: { term: string; definition: string }[];
}

// ============= Main Loader =============

export async function getUnitDetail(
  courseId: string,
  unitId: string
): Promise<UnitPageData | null> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return getDemoUnitDetail(courseId, unitId);
  }

  // Fetch unit with full lesson tree
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: {
      subject: { select: { id: true, name: true, icon: true, gradeLevel: true, active: true } },
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
  });

  if (!unit || !unit.subject.active) return null;

  // Verify course match
  if (unit.subject.id !== courseId) return null;

  // Verify student enrollment (same grade level)
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { gradeLevel: true },
  });
  if (!dbUser) return null;
  const studentGrade = dbUser.gradeLevel || 7;
  if (unit.subject.gradeLevel !== studentGrade) return null;

  // Resolve subject mode from subject name
  const subjectMode = resolveSubjectMode(null, unit.subject.name);

  // Fetch progress (include masteryScore for display)
  const lessonIds = unit.lessons.map((l) => l.id);
  const progressRecords = await prisma.studentProgress.findMany({
    where: { studentId: userId, lessonId: { in: lessonIds } },
  });
  const progressMap = new Map(progressRecords.map((p) => [p.lessonId, p]));

  // Fetch submissions for activities in this unit
  const allActivityIds = unit.lessons.flatMap((l) => l.activities.map((a) => a.id));
  const submissions = allActivityIds.length > 0
    ? await prisma.submission.findMany({
        where: { studentId: userId, activityId: { in: allActivityIds } },
        select: { activityId: true, score: true, maxScore: true },
      })
    : [];
  const submissionMap = new Map(submissions.map((s) => [s.activityId, s]));

  // Build lessons with gating
  const lessons: LessonItem[] = unit.lessons.map((lesson, i) => {
    const progress = progressMap.get(lesson.id);
    const status = progress?.status ?? 'NOT_STARTED';

    // Subject-aware unlock: first lesson always unlocked, rest depend on previous
    const prevStatus = i === 0 ? null : (progressMap.get(unit.lessons[i - 1].id)?.status ?? 'NOT_STARTED');
    const unlocked = isLessonUnlocked(prevStatus, subjectMode);
    const displayState = getLessonDisplayState(status, unlocked);

    const activities = lesson.activities.map((act) => {
      const sub = submissionMap.get(act.id);
      return {
        id: act.id,
        type: act.type,
        title: act.title,
        points: act.points,
        submitted: !!sub,
        score: sub?.score ?? null,
        maxScore: sub?.maxScore ?? null,
      };
    });

    return {
      id: lesson.id,
      title: lesson.title,
      subtitle: lesson.subtitle,
      order: lesson.order,
      status,
      displayState,
      completedAt: progress?.completedAt ?? null,
      masteryScore: (progress as any)?.masteryScore ?? null,
      activityCount: activities.length,
      completedActivities: activities.filter((a) => a.submitted).length,
      isNextLesson: false, // set below
      activities,
    };
  });

  // Resolve next lesson using shared helper
  const resolverLessons: LessonForResolver[] = lessons.map((l) => ({
    id: l.id,
    title: l.title,
    displayState: l.displayState,
  }));
  const nextLesson = resolveNextLesson(resolverLessons);
  if (nextLesson) {
    const target = lessons.find((l) => l.id === nextLesson.id);
    if (target) target.isNextLesson = true;
  }

  // Count done lessons using shared isLessonDone (includes MASTERED)
  const completedLessons = lessons.filter((l) => isLessonDone(l.status)).length;
  const totalLessons = lessons.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const unitStatus: UnitPageData['unitStatus'] =
    completedLessons === totalLessons && totalLessons > 0
      ? 'completed'
      : completedLessons > 0 || lessons.some((l) => l.status === 'IN_PROGRESS' || l.status === 'NEEDS_RETEACH')
        ? 'in-progress'
        : 'not-started';

  // Get instructional framing
  const framing = getUnitFraming(unit.subject.id, unit.id);

  return {
    courseId: unit.subject.id,
    courseName: unit.subject.name,
    courseIcon: unit.subject.icon,
    gradeLevel: unit.subject.gradeLevel,
    subjectMode,
    unitId: unit.id,
    unitTitle: unit.title,
    unitDescription: unit.description,
    unitIcon: unit.icon,
    unitOrder: unit.order,
    totalLessons,
    completedLessons,
    progressPercent,
    unitStatus,
    nextLessonId: nextLesson?.id ?? null,
    nextLessonTitle: nextLesson?.title ?? null,
    lessons,
    ...framing,
  };
}

// ============= Instructional Framing =============

interface UnitFraming {
  learningTargets: string[];
  successCriteria: string[];
  keyVocabulary: { term: string; definition: string }[];
}

function getUnitFraming(courseId: string, unitId: string): UnitFraming {
  const framingMap: Record<string, UnitFraming> = {
    // Grade 7 Science — Unit A: Interactions & Ecosystems
    'g7-sci-unit-a': {
      learningTargets: [
        'I can explain how living things interact within ecosystems',
        'I can describe how energy flows through food chains and webs',
        'I can explain how nutrient cycles support ecosystem health',
        'I can analyze human impacts on ecosystems and propose solutions',
        'I can design a plan for monitoring and conserving an ecosystem',
      ],
      successCriteria: [
        'I can distinguish between biotic and abiotic factors in an ecosystem',
        'I can describe symbiotic relationships and give examples',
        'I can construct a food chain showing energy transfer between trophic levels',
        'I can explain bioaccumulation and its effects on food webs',
        'I can evaluate human activities and their environmental impact',
      ],
      keyVocabulary: [
        { term: 'Ecosystem', definition: 'A community of living organisms interacting with their non-living environment' },
        { term: 'Biotic', definition: 'Living or once-living components of an ecosystem' },
        { term: 'Abiotic', definition: 'Non-living components of an ecosystem (water, air, sunlight, soil)' },
        { term: 'Symbiosis', definition: 'A close relationship between two species living together' },
        { term: 'Food Chain', definition: 'A sequence showing how energy passes from one organism to another' },
        { term: 'Trophic Level', definition: 'A feeding level in the ecosystem energy pyramid' },
        { term: 'Bioaccumulation', definition: 'The buildup of pollutants in organisms over time through the food chain' },
        { term: 'Succession', definition: 'The gradual process of ecosystem change and development over time' },
        { term: 'Stewardship', definition: 'The responsible care and management of the environment' },
        { term: 'Producer', definition: 'An organism that makes its own food through photosynthesis' },
        { term: 'Consumer', definition: 'An organism that gets energy by eating other organisms' },
        { term: 'Decomposer', definition: 'An organism that breaks down dead matter and recycles nutrients' },
      ],
    },
    // Grade 7 Science — Unit B: Plants for Food & Fibre
    'g7-sci-unit-b': {
      learningTargets: [
        'I can explain the structures and functions of flowering plants',
        'I can describe how plants are grown for food and fibre',
        'I can analyze technologies used in plant agriculture',
        'I can evaluate sustainability practices in plant production',
      ],
      successCriteria: [
        'I can identify the main parts of a plant and explain their functions',
        'I can describe the stages of plant growth from seed to harvest',
        'I can compare traditional and modern farming techniques',
        'I can evaluate the environmental impact of different farming practices',
      ],
      keyVocabulary: [
        { term: 'Photosynthesis', definition: 'The process plants use to convert sunlight, water, and CO₂ into food' },
        { term: 'Germination', definition: 'The process of a seed beginning to grow into a new plant' },
        { term: 'Pollination', definition: 'The transfer of pollen to enable fertilization and seed production' },
        { term: 'Sustainability', definition: 'Meeting present needs without compromising future resources' },
        { term: 'Monoculture', definition: 'Growing a single crop over a large area' },
        { term: 'Fibre', definition: 'Plant material used to make textiles, paper, and other products' },
      ],
    },
  };

  if (framingMap[unitId]) return framingMap[unitId];
  return { learningTargets: [], successCriteria: [], keyVocabulary: [] };
}

// ============= Demo Data =============

function getDemoUnitDetail(courseId: string, unitId: string): UnitPageData | null {
  const demoUnits: Record<string, {
    courseName: string; courseIcon: string; gradeLevel: number;
    unitTitle: string; unitDesc: string; unitIcon: string; unitOrder: number;
    lessons: { title: string; subtitle: string; activities: { type: string; title: string; points: number }[] }[];
    framing: UnitFraming;
  }> = {
    'g7-sci-unit-a': {
      courseName: 'Science', courseIcon: '🔬', gradeLevel: 7,
      unitTitle: 'Interactions & Ecosystems', unitDesc: 'Explore how living things interact within ecosystems, how energy flows through food chains and webs, and how human activity impacts the natural world.',
      unitIcon: '🌿', unitOrder: 0,
      lessons: [
        { title: 'Introduction to Ecosystems', subtitle: 'Biotic & abiotic factors, ecosystem interactions, and how ecosystems meet the needs of life', activities: [
          { type: 'ACTIVITY', title: 'Biotic vs Abiotic Sorter', points: 0 },
          { type: 'QUIZ', title: 'Check Your Understanding', points: 10 },
        ]},
        { title: 'Interactions & Interdependence', subtitle: 'Species dependencies, adaptations, and symbiotic relationships', activities: [
          { type: 'ACTIVITY', title: 'Relationship Classifier', points: 0 },
          { type: 'ACTIVITY', title: 'Adaptation Matcher', points: 0 },
          { type: 'QUIZ', title: 'Check Your Understanding', points: 10 },
        ]},
        { title: 'Food Chains, Webs & Energy Flow', subtitle: 'Producers, consumers, decomposers, and how energy moves through ecosystems', activities: [
          { type: 'ACTIVITY', title: 'Food Chain Builder', points: 0 },
          { type: 'ACTIVITY', title: 'Trophic Level Sorter', points: 0 },
          { type: 'QUIZ', title: 'Check Your Understanding', points: 10 },
        ]},
        { title: 'Nutrient Cycles & Bioaccumulation', subtitle: 'Carbon cycle, water cycle, and how pollutants concentrate in food chains', activities: [
          { type: 'ACTIVITY', title: 'Cycle Identifier', points: 0 },
          { type: 'ACTIVITY', title: 'Bioaccumulation Predictor', points: 0 },
          { type: 'QUIZ', title: 'Check Your Understanding', points: 10 },
        ]},
        { title: 'Ecosystem Monitoring & Change', subtitle: 'Habitat investigation, species distribution, and population changes over time', activities: [
          { type: 'ACTIVITY', title: 'Monitoring Method Matcher', points: 0 },
          { type: 'ACTIVITY', title: 'Succession Sequencer', points: 0 },
          { type: 'QUIZ', title: 'Check Your Understanding', points: 10 },
        ]},
        { title: 'Human Impact on Ecosystems', subtitle: 'Pollution, deforestation, invasive species, and connecting impacts to human needs', activities: [
          { type: 'ACTIVITY', title: 'Impact Analyzer', points: 0 },
          { type: 'ACTIVITY', title: 'Invasive Species Detective', points: 0 },
          { type: 'QUIZ', title: 'Check Your Understanding', points: 10 },
        ]},
        { title: 'Stewardship & Environmental Decisions', subtitle: 'Evaluating evidence, proposing solutions, and making informed environmental choices', activities: [
          { type: 'ACTIVITY', title: 'Perspective Analyzer', points: 0 },
          { type: 'ACTIVITY', title: 'Stewardship Action Sorter', points: 0 },
          { type: 'QUIZ', title: 'Check Your Understanding', points: 10 },
        ]},
        { title: 'Performance Task: Ecosystem Conservation Plan', subtitle: 'Design a conservation plan for an Alberta ecosystem — demonstrate everything you\'ve learned', activities: [
          { type: 'ASSIGNMENT', title: 'Conservation Plan Submission', points: 30 },
        ]},
      ],
      framing: {
        learningTargets: [
          'I can explain how living things interact within ecosystems',
          'I can describe how energy flows through food chains and webs',
          'I can explain how nutrient cycles support ecosystem health',
          'I can analyze human impacts on ecosystems and propose solutions',
          'I can design a plan for monitoring and conserving an ecosystem',
        ],
        successCriteria: [
          'I can distinguish between biotic and abiotic factors in an ecosystem',
          'I can describe symbiotic relationships and give examples',
          'I can construct a food chain showing energy transfer between trophic levels',
          'I can explain bioaccumulation and its effects on food webs',
          'I can evaluate human activities and their environmental impact',
        ],
        keyVocabulary: [
          { term: 'Ecosystem', definition: 'A community of living organisms interacting with their non-living environment' },
          { term: 'Biotic', definition: 'Living or once-living components of an ecosystem' },
          { term: 'Abiotic', definition: 'Non-living components of an ecosystem (water, air, sunlight, soil)' },
          { term: 'Symbiosis', definition: 'A close relationship between two species living together' },
          { term: 'Food Chain', definition: 'A sequence showing how energy passes from one organism to another' },
          { term: 'Trophic Level', definition: 'A feeding level in the ecosystem energy pyramid' },
          { term: 'Bioaccumulation', definition: 'The buildup of pollutants in organisms over time through the food chain' },
          { term: 'Succession', definition: 'The gradual process of ecosystem change and development over time' },
          { term: 'Stewardship', definition: 'The responsible care and management of the environment' },
          { term: 'Producer', definition: 'An organism that makes its own food through photosynthesis' },
          { term: 'Consumer', definition: 'An organism that gets energy by eating other organisms' },
          { term: 'Decomposer', definition: 'An organism that breaks down dead matter and recycles nutrients' },
        ],
      },
    },
  };

  const demoData = demoUnits[unitId];
  if (!demoData) return null;

  const subjectMode = resolveSubjectMode(null, demoData.courseName);

  const lessons: LessonItem[] = demoData.lessons.map((l, i) => ({
    id: `${unitId}-l${i}`,
    title: l.title,
    subtitle: l.subtitle,
    order: i,
    status: 'NOT_STARTED',
    displayState: i === 0 ? 'AVAILABLE' as const : 'LOCKED' as const,
    completedAt: null,
    masteryScore: null,
    activityCount: l.activities.length,
    completedActivities: 0,
    isNextLesson: i === 0,
    activities: l.activities.map((a, j) => ({
      id: `${unitId}-l${i}-a${j}`,
      type: a.type,
      title: a.title,
      points: a.points,
      submitted: false,
      score: null,
      maxScore: null,
    })),
  }));

  return {
    courseId,
    courseName: demoData.courseName,
    courseIcon: demoData.courseIcon,
    gradeLevel: demoData.gradeLevel,
    subjectMode,
    unitId,
    unitTitle: demoData.unitTitle,
    unitDescription: demoData.unitDesc,
    unitIcon: demoData.unitIcon,
    unitOrder: demoData.unitOrder,
    totalLessons: lessons.length,
    completedLessons: 0,
    progressPercent: 0,
    unitStatus: 'not-started',
    nextLessonId: lessons[0]?.id ?? null,
    nextLessonTitle: lessons[0]?.title ?? null,
    lessons,
    ...demoData.framing,
  };
}

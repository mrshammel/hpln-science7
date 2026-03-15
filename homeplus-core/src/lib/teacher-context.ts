// ============================================
// Teacher Context — Home Plus LMS
// ============================================
// Grade + Subject context for the teacher dashboard.
// All teacher views use this context to scope data queries.
//
// Architecture:
//   - URL search params: ?grade=7&subject=science
//   - Context resolved server-side per page
//   - Links/nav preserve context via buildContextQuery()

import { prisma } from '@/lib/db';

// ---------- Types ----------

export interface GradeSubjectContext {
  grade: number;
  subjectId: string;
  subjectName: string;
  subjectIcon: string;
}

export interface AvailableContext {
  grade: number;
  subjectId: string;
  subjectName: string;
  subjectIcon: string;
}

// ---------- Constants ----------

/** All grades the platform can serve */
export const ALL_GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** Core subject names */
export const CORE_SUBJECTS = ['ELA', 'Math', 'Science', 'Social Studies'] as const;

/** Subject name → URL slug mapping */
const SUBJECT_SLUGS: Record<string, string> = {
  'ELA': 'ela',
  'Math': 'math',
  'Science': 'science',
  'Social Studies': 'social-studies',
};

/** URL slug → Subject name mapping */
const SLUG_TO_SUBJECT: Record<string, string> = {
  'ela': 'ELA',
  'math': 'Math',
  'science': 'Science',
  'social-studies': 'Social Studies',
  'socialstudies': 'Social Studies',
  'social_studies': 'Social Studies',
};

// ---------- Default Context ----------

const DEFAULT_CONTEXT: GradeSubjectContext = {
  grade: 7,
  subjectId: 'demo-science-7',
  subjectName: 'Science',
  subjectIcon: '🔬',
};

// ---------- Fetch Available Contexts ----------

/**
 * Get all grade-subject contexts available to a teacher.
 * In demo mode, returns a default Grade 7 Science context.
 */
export async function getAvailableContexts(teacherId: string): Promise<AvailableContext[]> {
  try {
    // Fetch active subjects from DB
    const subjects = await prisma.subject.findMany({
      where: { active: true },
      orderBy: [{ gradeLevel: 'asc' }, { order: 'asc' }],
    });

    if (subjects.length > 0) {
      return subjects.map((s) => ({
        grade: s.gradeLevel,
        subjectId: s.id,
        subjectName: s.name,
        subjectIcon: s.icon,
      }));
    }
  } catch {
    // Fall through to demo
  }

  // Demo contexts — Grade 7 Science (matches existing demo data)
  return [
    { grade: 7, subjectId: 'demo-science-7', subjectName: 'Science', subjectIcon: '🔬' },
  ];
}

// ---------- Context Resolution ----------

/**
 * Resolve grade + subject context from URL search params.
 * Falls back to the teacher's first available context if params are missing.
 */
export async function resolveContext(
  searchParams: Record<string, string | string[] | undefined>,
  teacherId: string,
): Promise<GradeSubjectContext> {
  const availableContexts = await getAvailableContexts(teacherId);
  if (availableContexts.length === 0) return DEFAULT_CONTEXT;

  const gradeParam = typeof searchParams.grade === 'string' ? parseInt(searchParams.grade, 10) : null;
  const subjectParam = typeof searchParams.subject === 'string' ? searchParams.subject.toLowerCase() : null;

  if (gradeParam && subjectParam) {
    // Try to find a matching context
    const subjectName = SLUG_TO_SUBJECT[subjectParam] || subjectParam;
    const match = availableContexts.find(
      (c) => c.grade === gradeParam && c.subjectName.toLowerCase() === subjectName.toLowerCase()
    );
    if (match) {
      return {
        grade: match.grade,
        subjectId: match.subjectId,
        subjectName: match.subjectName,
        subjectIcon: match.subjectIcon,
      };
    }
  }

  // Fallback: first available context
  const first = availableContexts[0];
  return {
    grade: first.grade,
    subjectId: first.subjectId,
    subjectName: first.subjectName,
    subjectIcon: first.subjectIcon,
  };
}

// ---------- URL Helpers ----------

/** Build search param string for preserving context in links */
export function buildContextQuery(ctx: GradeSubjectContext): string {
  const slug = SUBJECT_SLUGS[ctx.subjectName] || ctx.subjectName.toLowerCase().replace(/\s+/g, '-');
  return `?grade=${ctx.grade}&subject=${slug}`;
}

/** Build a full URL path with context */
export function buildContextHref(basePath: string, ctx: GradeSubjectContext): string {
  return `${basePath}${buildContextQuery(ctx)}`;
}

// ---------- Display ----------

/** Display label for the context, e.g. "Grade 7 · Science" */
export function formatContextLabel(ctx: GradeSubjectContext): string {
  return `Grade ${ctx.grade} · ${ctx.subjectName}`;
}

/** Short label, e.g. "Gr. 7 Science" */
export function formatContextShort(ctx: GradeSubjectContext): string {
  return `Gr. ${ctx.grade} ${ctx.subjectName}`;
}

// ============================================
// Teacher Context — Home Plus LMS
// ============================================
// Grade + Subject context for the teacher dashboard.
// All teacher views use this context to scope data queries.
//
// Architecture:
//   - URL search params: ?grade=7&subject=science
//   - Context resolved server-side per page
//   - subjectSlug used for stable URL matching (not display names)
//   - getAvailableContexts() scoped to teacher assignment
//   - Links/nav preserve context via buildContextQuery()

import { prisma } from '@/lib/db';
import { isDemoMode } from '@/lib/teacher-auth';

// ---------- Types ----------

export interface GradeSubjectContext {
  grade: number;
  subjectId: string;
  subjectName: string;
  subjectSlug: string;
  subjectIcon: string;
}

export interface AvailableContext {
  grade: number;
  subjectId: string;
  subjectName: string;
  subjectSlug: string;
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

/** Derive a slug from a subject name */
function toSlug(name: string): string {
  return SUBJECT_SLUGS[name] || name.toLowerCase().replace(/\s+/g, '-');
}

// ---------- Default Context ----------

const DEFAULT_CONTEXT: GradeSubjectContext = {
  grade: 7,
  subjectId: 'demo-science-7',
  subjectName: 'Science',
  subjectSlug: 'science',
  subjectIcon: '🔬',
};

// ---------- Fetch Available Contexts ----------

/**
 * Get grade-subject contexts assigned to a specific teacher.
 * In production: queries teacher assignment → subjects.
 * In demo mode: returns Grade 7 Science.
 */
export async function getAvailableContexts(teacherId: string): Promise<AvailableContext[]> {
  if (isDemoMode()) {
    return [
      { grade: 7, subjectId: 'demo-science-7', subjectName: 'Science', subjectSlug: 'science', subjectIcon: '🔬' },
    ];
  }

  try {
    // Get students assigned to this teacher, derive their grade-subject contexts
    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        assignedTeacherId: teacherId,
      },
      select: { gradeLevel: true },
    });

    if (students.length === 0) return [DEFAULT_CONTEXT];

    // Get unique grade levels from the teacher's assigned students
    const grades = [...new Set(students.map((s: { gradeLevel: number | null }) => s.gradeLevel).filter(Boolean))] as number[];

    if (grades.length === 0) return [DEFAULT_CONTEXT];

    // Find active subjects for those grades
    const subjects = await prisma.subject.findMany({
      where: {
        active: true,
        gradeLevel: { in: grades },
      },
      orderBy: [{ gradeLevel: 'asc' }, { order: 'asc' }],
    });

    if (subjects.length > 0) {
      return subjects.map((s) => ({
        grade: s.gradeLevel,
        subjectId: s.id,
        subjectName: s.name,
        subjectSlug: toSlug(s.name),
        subjectIcon: s.icon,
      }));
    }
  } catch (err) {
    console.error('[teacher-context] getAvailableContexts failed:', err);
  }

  return [DEFAULT_CONTEXT];
}

// ---------- Context Resolution ----------

/**
 * Resolve grade + subject context from URL search params.
 * Uses subjectSlug for stable matching (not display names).
 * Falls back to the teacher's first available context if params are invalid.
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
    // Match by slug first (stable), then by name (fallback)
    const match = availableContexts.find(
      (c) => c.grade === gradeParam && c.subjectSlug === subjectParam
    ) || availableContexts.find(
      (c) => c.grade === gradeParam && (SLUG_TO_SUBJECT[subjectParam] || '').toLowerCase() === c.subjectName.toLowerCase()
    );

    if (match) return match;
  }

  // Fallback: first available context
  return availableContexts[0];
}

// ---------- URL Helpers ----------

/** Build search param string for preserving context in links */
export function buildContextQuery(ctx: GradeSubjectContext): string {
  return `?grade=${ctx.grade}&subject=${ctx.subjectSlug}`;
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

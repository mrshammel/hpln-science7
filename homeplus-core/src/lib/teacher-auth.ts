// ============================================
// Teacher Auth Helper — Home Plus LMS
// ============================================
// Server-side helpers for teacher identity.
// Used by all teacher-facing pages and data layers.
// Uses real NextAuth sessions — no hardcoded IDs.

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

// ---------- Demo Mode ----------

/**
 * Demo mode gate. Controls whether demo data is used.
 * In production, set NEXT_PUBLIC_DEMO_MODE=false or remove it.
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
}

// ---------- Teacher Identity ----------

/**
 * Get the current teacher's ID from the server-side session.
 * Verifies the user has TEACHER or ADMIN role.
 * Redirects non-teachers to /dashboard.
 */
export async function getTeacherId(): Promise<string> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    // Not authenticated at all — redirect to homepage
    redirect('/');
  }

  const role = (session.user as any).role as string | undefined;
  const userId = (session.user as any).id as string | undefined;

  if (!userId) {
    redirect('/');
  }

  // Allow TEACHER and ADMIN roles
  if (role === 'TEACHER' || role === 'ADMIN') {
    return userId;
  }

  // Authenticated but not a teacher — send to verification page
  redirect('/teacher-verify');
}

/**
 * Get the current teacher's ID without redirecting.
 * Returns null if not authenticated or not a teacher.
 * Useful for API routes where we want to return 401 instead of redirecting.
 */
export async function getTeacherIdOrNull(): Promise<string | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user) return null;

  const role = (session.user as any).role as string | undefined;
  const userId = (session.user as any).id as string | undefined;

  if (!userId) return null;
  if (role !== 'TEACHER' && role !== 'ADMIN') return null;

  return userId;
}

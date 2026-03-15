// ============================================
// Teacher Auth Helper — Home Plus LMS
// ============================================
// Server-side helpers for teacher identity and demo mode.
// Used by all teacher-facing pages and data layers.

// ---------- Demo Mode ----------

/**
 * Demo mode gate. Controls whether demo data is used.
 * In production, set NEXT_PUBLIC_DEMO_MODE=false or remove it.
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
}

// ---------- Teacher Identity ----------

// Demo teacher ID used when no auth session is available.
const DEMO_TEACHER_ID = 'demo-teacher';

/**
 * Get the current teacher's ID from the server-side session.
 * Falls back to a demo teacher ID when no session is available.
 *
 * TODO: Replace with real NextAuth getServerSession() when auth is wired up.
 * The real implementation should:
 *   1. Call getServerSession(authOptions)
 *   2. Verify the user has role TEACHER
 *   3. Return the teacher's user ID
 *   4. Throw or redirect if not authenticated
 */
export async function getTeacherId(): Promise<string> {
  if (isDemoMode()) return DEMO_TEACHER_ID;

  // Placeholder: in production, replace with session-based teacher identity.
  return DEMO_TEACHER_ID;
}

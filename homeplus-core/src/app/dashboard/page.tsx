// ============================================
// Dashboard Redirect — Home Plus LMS
// ============================================
// Central role-based routing hub.
// All "Go to Dashboard" buttons point here.
// This is the SINGLE SOURCE OF TRUTH for role → dashboard mapping.

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    // Not authenticated → back to homepage
    redirect('/');
  }

  const role = (session.user as any).role as string | undefined;

  switch (role) {
    case 'STUDENT':
      redirect('/student/dashboard');

    case 'TEACHER':
      redirect('/teacher');

    // ADMIN routes to teacher dashboard (no admin dashboard yet)
    case 'ADMIN':
      redirect('/teacher');

    default:
      // Unknown role → safe fallback to homepage
      redirect('/');
  }
}

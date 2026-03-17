// ============================================
// Route Protection Middleware — Home Plus LMS
// ============================================
// Protects /dashboard, /student/*, /teacher/* routes.
// Enforces authentication and role-based access.
// Uses NextAuth JWT token for server-side role resolution.
//
// NOTE: Next.js 16 deprecates middleware.ts in favor of "proxy".
// This middleware still functions correctly and is retained because
// next-auth/jwt getToken() has no direct proxy equivalent yet.
// Migrate to proxy convention when next-auth supports it natively.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Paths that require authentication
const PROTECTED_PREFIXES = ['/dashboard', '/student', '/teacher'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect specific route prefixes
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(prefix + '/')
  );
  if (!isProtected) return NextResponse.next();

  // Allow NextAuth API routes through
  if (pathname.startsWith('/api/')) return NextResponse.next();

  // ---------- Authentication Check ----------

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    // Unauthenticated → redirect to homepage
    const signInUrl = new URL('/', request.url);
    return NextResponse.redirect(signInUrl);
  }

  // ---------- Role-Based Access Control ----------

  const role = (token as Record<string, unknown>).role as string | undefined;

  // /student/* routes: only STUDENT role
  if (pathname.startsWith('/student')) {
    if (role !== 'STUDENT') {
      // Wrong role → send to /dashboard for proper routing
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // /teacher/* routes: TEACHER and ADMIN allowed, STUDENT denied
  if (pathname.startsWith('/teacher')) {
    if (role === 'STUDENT') {
      // Students cannot access teacher area
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/student/:path*', '/teacher/:path*'],
};

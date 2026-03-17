// ============================================
// Teacher Context Provider — Home Plus LMS
// ============================================
// Server component that fetches teacher-assigned contexts
// and passes them to the client layout component.
// This ensures the client selector only shows valid cohorts.

import { Suspense } from 'react';
import { getTeacherId } from '@/lib/teacher-auth';
import { getAvailableContexts, resolveContext } from '@/lib/teacher-context';
import { getRecentSubmissions } from '@/lib/teacher-data';
import type { AvailableContext } from '@/lib/teacher-context';
import TeacherLayoutClient from './layout-client';

interface Props {
  children: React.ReactNode;
}

export default async function TeacherLayout({ children }: Props) {
  const teacherId = await getTeacherId();
  const assignedContexts = await getAvailableContexts(teacherId);

  // Fetch pending review count for sidebar badge
  const ctx = await resolveContext({}, teacherId);
  const allSubmissions = await getRecentSubmissions(teacherId, ctx);
  const pendingCount = allSubmissions.filter((s) => !s.reviewed).length;

  return (
    // Suspense boundary required because TeacherLayoutClient uses useSearchParams(),
    // which needs a Suspense fallback for Next.js 16 static rendering.
    <Suspense fallback={null}>
      <TeacherLayoutClient assignedContexts={assignedContexts} pendingReviewCount={pendingCount}>
        {children}
      </TeacherLayoutClient>
    </Suspense>
  );
}

export type { AvailableContext };


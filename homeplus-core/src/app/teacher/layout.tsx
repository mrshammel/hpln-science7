// ============================================
// Teacher Context Provider — Home Plus LMS
// ============================================
// Server component that fetches teacher-assigned contexts
// and passes them to the client layout component.
// This ensures the client selector only shows valid cohorts.

import { getTeacherId } from '@/lib/teacher-auth';
import { getAvailableContexts } from '@/lib/teacher-context';
import type { AvailableContext } from '@/lib/teacher-context';
import TeacherLayoutClient from './layout-client';

interface Props {
  children: React.ReactNode;
}

export default async function TeacherLayout({ children }: Props) {
  const teacherId = await getTeacherId();
  const assignedContexts = await getAvailableContexts(teacherId);

  return (
    <TeacherLayoutClient assignedContexts={assignedContexts}>
      {children}
    </TeacherLayoutClient>
  );
}

export type { AvailableContext };

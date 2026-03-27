'use client';

import { useState, useMemo, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import styles from './teacher.module.css';
import type { AvailableContext } from '@/lib/teacher-context';

// ---------- Constants ----------

const NAV_ITEMS = [
  { href: '/teacher', icon: '📊', label: 'Overview' },
  { href: '/teacher/students', icon: '👥', label: 'Students' },
  { href: '/teacher/pacing', icon: '⏱️', label: 'Pacing' },
  { href: '/teacher/mastery', icon: '🧠', label: 'Mastery' },
  { href: '/teacher/submissions', icon: '📝', label: 'Submissions' },
  { href: '/teacher/notes', icon: '📋', label: 'Notes' },
  { href: '/teacher/courses', icon: '📚', label: 'Course Builder' },
];

// ---------- Props ----------

interface TeacherLayoutClientProps {
  children: ReactNode;
  assignedContexts: AvailableContext[];
  pendingReviewCount?: number;
}

// ---------- Layout Component ----------

export default function TeacherLayoutClient({ children, assignedContexts, pendingReviewCount = 0 }: TeacherLayoutClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ---------- Context Resolution ----------

  const currentGrade = searchParams.get('grade') || '';
  const currentSubject = searchParams.get('subject') || '';

  // Find the active context — validated against assigned contexts
  const activeContext = useMemo(() => {
    if (assignedContexts.length === 0) return null;

    // Try matching URL params to assigned contexts
    if (currentGrade && currentSubject) {
      const gradeNum = parseInt(currentGrade, 10);
      const match = assignedContexts.find(
        (c) => c.grade === gradeNum && c.subjectSlug === currentSubject
      );
      if (match) return match;
    }

    // Fallback: first assigned context
    return assignedContexts[0];
  }, [assignedContexts, currentGrade, currentSubject]);

  // ---------- Derived Values ----------

  const contextQuery = activeContext
    ? `?grade=${activeContext.grade}&subject=${activeContext.subjectSlug}`
    : '';

  const contextLabel = activeContext
    ? `Grade ${activeContext.grade} · ${activeContext.subjectName}`
    : 'No cohort assigned';

  const today = new Date().toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const currentNav = NAV_ITEMS.find((item) =>
    item.href === '/teacher'
      ? pathname === '/teacher'
      : pathname.startsWith(item.href)
  );
  const pageTitle = currentNav?.label || 'Dashboard';

  // ---------- Context Switching (Next.js router) ----------

  function handleContextChange(contextKey: string) {
    const selected = assignedContexts.find(
      (c) => `${c.grade}-${c.subjectSlug}` === contextKey
    );
    if (selected) {
      router.push(`${pathname}?grade=${selected.grade}&subject=${selected.subjectSlug}`);
    }
  }

  const activeContextKey = activeContext ? `${activeContext.grade}-${activeContext.subjectSlug}` : '';

  // ---------- Render ----------

  return (
    <div className={styles.dashLayout}>
      {/* Mobile overlay */}
      <div
        className={`${styles.overlay} ${sidebarOpen ? styles.overlayVisible : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <nav className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <Image
            src="/images/hpln-logo.png"
            alt="Home Plus"
            width={140}
            height={44}
            className={styles.sidebarLogo}
          />
          <div className={styles.sidebarTitle}>Teacher Dashboard</div>
        </div>

        <div className={styles.navItems}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/teacher'
              ? pathname === '/teacher'
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={`${item.href}${contextQuery}`}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {item.label}
                {item.href === '/teacher/submissions' && pendingReviewCount > 0 && (
                  <span className={styles.navBadge}>{pendingReviewCount}</span>
                )}
              </Link>
            );
          })}
        </div>

        <div className={styles.sidebarFooter}>
          <Link href="/" className={styles.backLink}>
            ← Back to Home Plus
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <main className={styles.mainContent}>
        <div className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              className={styles.menuBtn}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
            >
              ☰
            </button>
            <h1 className={styles.topbarTitle}>{pageTitle}</h1>
            <span className={styles.topbarDate}>{today}</span>
          </div>
          <div className={styles.topbarRight}>
            <button
              className={styles.signOutBtn}
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Context Selector Bar */}
        <div className={styles.contextBar}>
          <div className={styles.contextLeft}>
            <span className={styles.contextIcon}>{activeContext?.subjectIcon || '📚'}</span>
            <span className={styles.contextLabel}>{contextLabel}</span>
          </div>
          <div className={styles.contextSelectors}>
            {assignedContexts.length > 1 ? (
              <select
                className={styles.contextSelect}
                value={activeContextKey}
                onChange={(e) => handleContextChange(e.target.value)}
              >
                {assignedContexts.map((ctx) => {
                  const key = `${ctx.grade}-${ctx.subjectSlug}`;
                  return (
                    <option key={key} value={key}>
                      {ctx.subjectIcon} Grade {ctx.grade} · {ctx.subjectName}
                    </option>
                  );
                })}
              </select>
            ) : (
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                {activeContext?.subjectIcon} Grade {activeContext?.grade} · {activeContext?.subjectName}
              </span>
            )}
          </div>
        </div>

        <div className={styles.pageContent}>
          {children}
        </div>
      </main>
    </div>
  );
}

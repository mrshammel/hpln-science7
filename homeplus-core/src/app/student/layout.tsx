'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import styles from './student.module.css';

// ---------- Nav Items ----------
const NAV_ITEMS = [
  { href: '/student/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/student/courses', icon: '📚', label: 'My Courses' },
  { href: '/student/progress', icon: '📊', label: 'Progress' },
  { href: '/student/assignments', icon: '📝', label: 'Assignments' },
  { href: '/student/grades', icon: '🎯', label: 'Grades' },
];

// ---------- Layout Component ----------
export default function StudentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userName = session?.user?.name || 'Student';
  const today = new Date().toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const currentNav = NAV_ITEMS.find((item) =>
    item.href === '/student/dashboard'
      ? pathname === '/student/dashboard'
      : pathname.startsWith(item.href)
  );
  const pageTitle = currentNav?.label || 'Dashboard';

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
          <div className={styles.sidebarTitle}>Student Dashboard</div>
        </div>

        <div className={styles.navItems}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/student/dashboard'
              ? pathname === '/student/dashboard'
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className={styles.sidebarFooter}>
          <Link href="/" className={styles.backLink}>
            ← Back to Home Plus
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className={styles.signOutLink}
          >
            Sign Out
          </button>
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
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {userName}
            </span>
            <button
              className={styles.signOutBtn}
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className={styles.pageContent}>
          {children}
        </div>
      </main>
    </div>
  );
}

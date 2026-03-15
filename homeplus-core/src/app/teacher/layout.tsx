'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './teacher.module.css';

const NAV_ITEMS = [
  { href: '/teacher', icon: '📊', label: 'Overview' },
  { href: '/teacher/students', icon: '👥', label: 'Students' },
  { href: '/teacher/pacing', icon: '⏱️', label: 'Pacing' },
  { href: '/teacher/submissions', icon: '📝', label: 'Submissions' },
  { href: '/teacher/notes', icon: '📋', label: 'Notes' },
];

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const today = new Date().toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Determine page title from nav
  const currentNav = NAV_ITEMS.find((item) =>
    item.href === '/teacher'
      ? pathname === '/teacher'
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
            <button className={styles.signOutBtn}>Sign Out</button>
          </div>
        </div>

        <div className={styles.pageContent}>
          {children}
        </div>
      </main>
    </div>
  );
}

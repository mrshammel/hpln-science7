// ============================================
// Shared Presentation Helpers — Home Plus LMS
// ============================================
// Centralized helpers for common UI presentation logic.
// Keep page components dumb; put all formatting here.

import type { EngagementStatus } from '@/lib/pacing';

/** Extract initials from a full name (e.g. "Ava Chen" → "AC") */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Teacher-friendly engagement label */
export function getEngagementLabel(status: EngagementStatus, daysSinceActive: number | null): string {
  if (status === 'STALLED') {
    if (daysSinceActive === null) return 'No academic activity recorded';
    return `No academic activity in ${daysSinceActive} day${daysSinceActive !== 1 ? 's' : ''}`;
  }
  if (daysSinceActive === null) return 'No academic activity yet';
  if (daysSinceActive === 0) return 'Active today';
  if (daysSinceActive === 1) return 'Active yesterday';
  return `Active ${daysSinceActive} days ago`;
}

/** Format a date for teacher display (e.g. "March 10, 2026") */
export function formatDate(date: Date | null | undefined): string {
  if (!date) return 'Unknown';
  return new Date(date).toLocaleDateString('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

/** Format a short date (e.g. "Mar 10") */
export function formatShortDate(date: Date | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric',
  });
}

/** Truncate text to a preview length */
export function truncateText(text: string, maxLength: number = 120): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '…';
}

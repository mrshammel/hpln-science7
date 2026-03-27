// ============================================
// Background Cron API — Home Plus LMS (Phase 6)
// ============================================
// POST: Runs all background maintenance tasks:
//   1. Refresh all student summaries
//   2. Generate review queues for all students
//   3. Expire stale review items
//
// Intended to be called by Vercel Cron or external scheduler.
// Protected by CRON_SECRET env var.
//
// Schedule recommendation: once daily at 6 AM local time.

import { NextRequest, NextResponse } from 'next/server';
import { refreshAllSummaries } from '@/lib/summary-service';
import { generateAllReviewQueues, expireStaleItems } from '@/lib/review-scheduler';

export const maxDuration = 60; // Allow up to 60 seconds for background processing

export async function POST(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const results: Record<string, unknown> = {};

  try {
    // 1. Expire stale review items (> 7 days old)
    const expiredCount = await expireStaleItems(7);
    results.expiredReviewItems = expiredCount;

    // 2. Refresh all student summaries
    const summaryResult = await refreshAllSummaries();
    results.summaryRefresh = summaryResult;

    // 3. Generate review queues for all students
    const reviewResult = await generateAllReviewQueues();
    results.reviewGeneration = reviewResult;

    const duration = Date.now() - startTime;
    results.durationMs = duration;

    console.log(`[cron/refresh] Completed in ${duration}ms:`, JSON.stringify(results));

    return NextResponse.json({
      ok: true,
      ...results,
    });
  } catch (err: any) {
    console.error('[cron/refresh] Error:', err);
    return NextResponse.json(
      {
        error: 'Background refresh failed',
        detail: err?.message,
        partialResults: results,
        durationMs: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

// Also support GET for easy testing/manual trigger
export async function GET(req: NextRequest) {
  return POST(req);
}

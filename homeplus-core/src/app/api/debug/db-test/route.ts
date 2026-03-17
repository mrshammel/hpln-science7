// Diagnostic endpoint — DELETE after debugging
// Visit: /api/debug/db-test

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function GET() {
  const checks: Record<string, string> = {};

  // Check 1: DATABASE_URL exists
  const dbUrl = process.env.DATABASE_URL;
  checks['DATABASE_URL_SET'] = dbUrl ? 'YES (length=' + dbUrl.length + ')' : 'NO — MISSING!';
  if (dbUrl) {
    // Mask the password
    checks['DATABASE_URL_HOST'] = dbUrl.replace(/\/\/[^@]+@/, '//***@');
  }

  // Check 2: NEXTAUTH_SECRET exists
  checks['NEXTAUTH_SECRET_SET'] = process.env.NEXTAUTH_SECRET ? 'YES' : 'NO';

  // Check 3: GOOGLE_CLIENT_ID exists
  checks['GOOGLE_CLIENT_ID_SET'] = process.env.GOOGLE_CLIENT_ID ? 'YES' : 'NO';

  // Check 4: Try Prisma connection
  try {
    const prisma = new PrismaClient();
    const userCount = await prisma.user.count();
    checks['PRISMA_CONNECTION'] = 'OK';
    checks['USER_COUNT'] = String(userCount);
    await prisma.$disconnect();
  } catch (err: any) {
    checks['PRISMA_CONNECTION'] = 'FAILED';
    checks['PRISMA_ERROR'] = err.message?.slice(0, 300) || 'unknown';
    checks['PRISMA_ERROR_CODE'] = err.code || 'none';
  }

  return NextResponse.json(checks, { status: 200 });
}

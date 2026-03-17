import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const checks: Record<string, string> = {};
  checks['DATABASE_URL_SET'] = process.env.DATABASE_URL ? 'YES' : 'NO';
  checks['NODE_ENV'] = process.env.NODE_ENV || 'unknown';

  try {
    const count = await prisma.user.count();
    checks['DB_CONNECTION'] = 'OK';
    checks['USER_COUNT'] = String(count);

    // List users with roles
    const users = await prisma.user.findMany({
      select: { email: true, role: true, name: true },
      take: 10,
    });
    checks['USERS'] = JSON.stringify(users);
  } catch (err: any) {
    checks['DB_CONNECTION'] = 'FAILED';
    checks['ERROR'] = err?.message?.slice(0, 500) || 'unknown';
    checks['ERROR_CODE'] = err?.code || 'none';
  }

  return NextResponse.json(checks);
}

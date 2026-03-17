// ============================================
// Teacher Access Code Verification — API Route
// ============================================
// POST: Verify access code and elevate user to TEACHER role.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = (session.user as any).id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
  }

  const body = await request.json();
  const { accessCode } = body;

  if (!accessCode || typeof accessCode !== 'string') {
    return NextResponse.json({ error: 'Access code is required' }, { status: 400 });
  }

  // Check against environment variable
  const expectedCode = process.env.TEACHER_ACCESS_CODE;
  if (!expectedCode) {
    console.error('[TeacherVerify] TEACHER_ACCESS_CODE is not set in environment');
    return NextResponse.json({ error: 'Teacher verification is not configured' }, { status: 500 });
  }

  if (accessCode.trim() !== expectedCode.trim()) {
    return NextResponse.json({ error: 'Invalid access code' }, { status: 403 });
  }

  // Elevate user to TEACHER role
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'TEACHER' },
    });

    console.log(`[TeacherVerify] User ${userId} (${session.user.email}) elevated to TEACHER`);

    return NextResponse.json({ success: true, message: 'Teacher access granted' });
  } catch (error) {
    console.error('[TeacherVerify] Role update error:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

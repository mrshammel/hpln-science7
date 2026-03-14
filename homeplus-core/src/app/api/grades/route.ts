import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calculateGrades } from '@/lib/grades';

/**
 * GET /api/grades
 * Returns calculated grades for the current student.
 * Optional query: ?subjectId=X
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subjectId') || undefined;

    const gradeReport = await calculateGrades(user.id, subjectId);

    return NextResponse.json(gradeReport);
  } catch (error) {
    console.error('[API /grades GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getTeacherId } from '@/lib/teacher-auth';

/**
 * POST /api/teacher/notes
 * Create a teacher note from any context. Teacher-scoped.
 *
 * Body: {
 *   studentId: string,
 *   content: string,
 *   tag?: string,
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const teacherId = await getTeacherId();
    const body = await req.json();
    const { studentId, content, tag } = body;

    if (!studentId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, content' },
        { status: 400 },
      );
    }

    // Verify student is assigned to this teacher
    const student = await prisma.user.findFirst({
      where: { id: studentId, role: 'STUDENT', assignedTeacherId: teacherId },
      select: { id: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found or not authorized' }, { status: 404 });
    }

    const note = await prisma.teacherNote.create({
      data: {
        studentId,
        teacherId,
        content,
        tag: tag || 'General',
      },
    });

    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error('[API /teacher/notes POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

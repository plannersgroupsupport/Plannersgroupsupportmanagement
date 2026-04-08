import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    let whereClause: any = { type: 'NOTES' };
    
    if (userId) {
       const user = await (prisma as any).user.findUnique({
         where: { id: userId },
         include: { studentProfile: true }
       });
       
       if (user?.role === 'STUDENT' && user.studentProfile) {
          const courses = (user.studentProfile as any).courseName
            ? (user.studentProfile as any).courseName.split(',').map((c: string) => c.trim()).filter(Boolean)
            : [];
          
          if (courses.length > 0) {
            whereClause.OR = [
              { course: { in: courses } },
              { course: null },
              { course: '' }
            ];
          }
       }
    }

    const notes = await (prisma as any).file.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, role: true }
        }
      },
      orderBy: { uploadedAt: 'desc' }
    });

    return NextResponse.json(notes);
  } catch (error: any) {
    console.error('Failed to fetch notes:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'No note ID provided' }, { status: 400 });
    }

    const note = await prisma.file.findUnique({ where: { id } });
    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    try {
      const fileName = note.url.split('/').pop();
      if (fileName) {
        const filePath = join(process.cwd(), 'public', 'uploads', fileName);
        await unlink(filePath);
      }
    } catch (e) {
      console.warn('Could not delete file from filesystem', e);
    }

    await prisma.file.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete note:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete note' }, { status: 500 });
  }
}


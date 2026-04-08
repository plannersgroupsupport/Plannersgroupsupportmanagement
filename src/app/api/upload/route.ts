import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const data = await req.formData();
    const file: File | null = data.get('file') as unknown as File;
    const userId = data.get('userId') as string;
    const type = data.get('type') as string; // PHOTO, AGREEMENT, SSLC, NOTES

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file found in request' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Write file to local disk (public/uploads directory)
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // Directory already exists or error
    }

    // Sanitize file name
    const originalName = file.name || 'uploaded-file';
    const fileName = `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
    const path = join(uploadDir, fileName);
    
    await writeFile(path, buffer);
    const fileUrl = `/uploads/${fileName}`;
    const course = data.get('course') as string; // For NOTES

    // Link file to user in Database if userId and type are provided
    if (userId && type) {
      const dbFile = await (prisma as any).file.create({
         data: {
             userId: userId,
             type: type,
             course: type === 'NOTES' ? course : null,
             url: fileUrl
         }
      });
      return NextResponse.json({ success: true, url: fileUrl, fileId: dbFile.id });
    }

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error: any) {
    console.error('Data upload error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to upload and save file' }, { status: 500 });
  }
}

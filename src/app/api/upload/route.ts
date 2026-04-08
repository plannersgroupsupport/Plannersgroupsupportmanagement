import { NextResponse } from 'next/server';
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

    // UPLOAD TO VERCEL BLOB (Cloud Storage)
    const { put } = require('@vercel/blob');
    
    // Sanitize file name
    const originalName = file.name || 'uploaded-file';
    const fileName = `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
    
    const blob = await put(fileName, file, {
      access: 'public',
    });

    const fileUrl = blob.url;
    const course = data.get('course') as string; // For NOTES

    // Link file to user in Database if userId and type are provided
    if (userId && type) {
      console.log('Saving file record to DB...', { userId, type, fileUrl });
      const dbFile = await prisma.file.create({
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

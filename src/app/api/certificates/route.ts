import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// GET: Fetch all certificate requests with student details (for Staff)
export async function GET() {
  try {
    const records: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        cr.*, 
        u.name as studentName, 
        sp.admissionNo,
        (SELECT url FROM File WHERE userId = u.id AND type = 'SSLC' ORDER BY uploadedAt DESC LIMIT 1) as sslcUrl,
        (SELECT url FROM File WHERE userId = u.id AND type = 'PASSPORT_PHOTO' ORDER BY uploadedAt DESC LIMIT 1) as passportPhotoUrl,
        (SELECT url FROM File WHERE userId = u.id AND type = 'PHOTO' ORDER BY uploadedAt DESC LIMIT 1) as profilePhotoUrl
      FROM CertificateRecord cr
      JOIN StudentProfile sp ON cr.studentProfileId = sp.id
      JOIN User u ON sp.userId = u.id
      ORDER BY cr.appliedAt DESC
    `);
    return NextResponse.json(records);
  } catch (err: any) {
    console.error('Fetch certs error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Student applies for a certificate
export async function POST(req: Request) {
  try {
    const { studentProfileId, type } = await req.json();

    if (!studentProfileId) {
      return NextResponse.json({ error: 'Student Profile ID is required' }, { status: 400 });
    }

    // ELIGIBILITY CHECK: Student must be "Completed"
    const profile: any[] = await prisma.$queryRawUnsafe(
      'SELECT currentStatus FROM StudentProfile WHERE id = ?',
      studentProfileId
    );

    if (!profile || profile.length === 0 || profile[0].currentStatus !== 'Completed') {
      return NextResponse.json({ 
        error: 'Ineligible. You can only apply for a certificate after your status is marked as Completed by the faculty.' 
      }, { status: 403 });
    }

    // CHECK IF ALREADY APPLIED
    const existing: any[] = await prisma.$queryRawUnsafe(
      'SELECT id FROM CertificateRecord WHERE studentProfileId = ? AND type = ? AND status = "APPLIED"',
      studentProfileId, type || 'ALL'
    );

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Application already pending for this type.' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await prisma.$executeRawUnsafe(
      `INSERT INTO CertificateRecord (id, studentProfileId, type, status, appliedAt, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id, studentProfileId, type || 'ALL', 'APPLIED', now, now, now
    );

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error('Apply cert error:', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// PATCH: Staff marks certificate as ISSUED
export async function PATCH(req: Request) {
  try {
    const { id, status, type } = await req.json();

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const now = new Date().toISOString();

    if (status === 'ISSUED') {
      await prisma.$executeRawUnsafe(
        `UPDATE CertificateRecord SET status = "ISSUED", issuedAt = ?, type = ?, updatedAt = ? WHERE id = ?`,
        now, type, now, id
      );
    } else {
      await prisma.$executeRawUnsafe(
        `UPDATE CertificateRecord SET status = ?, updatedAt = ? WHERE id = ?`,
        status, now, id
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Update cert error:', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// DELETE: Remove a record
export async function DELETE(req: Request) {
    try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');
  
      if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  
      await prisma.$executeRawUnsafe(`DELETE FROM CertificateRecord WHERE id = ?`, id);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  }

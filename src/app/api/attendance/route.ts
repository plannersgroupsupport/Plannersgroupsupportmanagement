import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch attendance records for students in a given range
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const month = searchParams.get('month'); // format: YYYY-MM
    const startDateParam = searchParams.get('startDate'); // format: YYYY-MM-DD
    const endDateParam = searchParams.get('endDate'); // format: YYYY-MM-DD

    let whereClause: any = {};

    if (userId) {
      const profile = await prisma.studentProfile.findUnique({ where: { userId } });
      if (!profile) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
      whereClause.studentProfileId = profile.id;
    }

    if (month) {
      const [year, mon] = month.split('-').map(Number);
      whereClause.date = { 
        gte: new Date(year, mon - 1, 1), 
        lte: new Date(year, mon, 0, 23, 59, 59, 999) 
      };
    } else if (startDateParam && endDateParam) {
      whereClause.date = { 
        gte: new Date(startDateParam + 'T00:00:00.000Z'), 
        lte: new Date(endDateParam + 'T23:59:59.999Z') 
      };
    }

    const records = await prisma.attendance.findMany({
      where: whereClause,
      include: { studentProfile: { select: { userId: true } } },
      orderBy: { date: 'asc' }
    });

    // Return format depends on scope
    if (userId) {
      const attendanceMap: Record<string, string> = {};
      for (const r of records) {
        attendanceMap[r.date.toISOString().split('T')[0]] = r.status;
      }
      return NextResponse.json({ attendanceMap, records });
    } else {
      // Bulk view: { userId: { dateKey: status } }
      const bulkMap: Record<string, Record<string, string>> = {};
      for (const r of records) {
        const uId = r.studentProfile.userId;
        const dKey = r.date.toISOString().split('T')[0];
        if (!bulkMap[uId]) bulkMap[uId] = {};
        bulkMap[uId][dKey] = r.status;
      }
      return NextResponse.json({ bulkMap });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Mark or update attendance for a specific date
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { userId, status, date } = data;

    if (!userId || !status) {
      return NextResponse.json({ error: 'userId and status are required' }, { status: 400 });
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    // Parse the date or use today
    const targetDate = date ? new Date(date + 'T00:00:00.000Z') : new Date();
    const dateKey = targetDate.toISOString().split('T')[0];

    // Check if attendance already exists for this student on this date
    const startOfDay = new Date(dateKey + 'T00:00:00.000Z');
    const endOfDay = new Date(dateKey + 'T23:59:59.999Z');

    const existing = await prisma.attendance.findFirst({
      where: {
        studentProfileId: profile.id,
        date: { gte: startOfDay, lte: endOfDay }
      }
    });

    let attendance;
    if (existing) {
      if (status === 'CLEAR') {
        // Remove attendance record
        await prisma.attendance.delete({ where: { id: existing.id } });
        return NextResponse.json({ success: true, cleared: true });
      }
      // Update existing
      attendance = await prisma.attendance.update({
        where: { id: existing.id },
        data: { status }
      });
    } else {
      if (status === 'CLEAR') {
        return NextResponse.json({ success: true, cleared: true });
      }
      // Create new
      attendance = await prisma.attendance.create({
        data: {
          studentProfileId: profile.id,
          date: startOfDay,
          status,
        }
      });
    }

    return NextResponse.json({ success: true, attendance });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch holidays for a given month
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // YYYY-MM

    let whereClause: any = {};

    if (month) {
      const [year, mon] = month.split('-').map(Number);
      const startDate = new Date(year, mon - 1, 1);
      const endDate = new Date(year, mon, 0, 23, 59, 59, 999);
      whereClause.date = { gte: startDate, lte: endDate };
    }

    const holidays = await prisma.holiday.findMany({
      where: whereClause,
      orderBy: { date: 'asc' }
    });

    // Return as a map of date string -> reason
    const holidayMap: Record<string, string> = {};
    for (const h of holidays) {
      const dateKey = h.date.toISOString().split('T')[0];
      holidayMap[dateKey] = h.reason || 'Holiday';
    }

    return NextResponse.json({ holidayMap, holidays });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Toggle a holiday on a specific date
export async function POST(req: Request) {
  try {
    const { date, reason } = await req.json();

    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 });
    }

    const targetDate = new Date(date + 'T00:00:00.000Z');

    // Check if holiday already exists
    const existing = await prisma.holiday.findUnique({
      where: { date: targetDate }
    });

    if (existing) {
      // Remove holiday
      await prisma.holiday.delete({ where: { id: existing.id } });
      return NextResponse.json({ success: true, removed: true });
    } else {
      // Add holiday
      const holiday = await prisma.holiday.create({
        data: { date: targetDate, reason: reason || 'Holiday' }
      });
      return NextResponse.json({ success: true, holiday });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

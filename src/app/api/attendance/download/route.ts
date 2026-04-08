import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Download attendance report as CSV for a given month
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // YYYY-MM

    if (!month) {
      return NextResponse.json({ error: 'month parameter is required (YYYY-MM)' }, { status: 400 });
    }

    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(year, mon, 0).getDate();

    // Fetch all holidays for the month
    const holidays = await prisma.holiday.findMany({
      where: { date: { gte: startDate, lte: endDate } }
    });
    const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]));

    // Calculate working days (exclude Sundays and holidays)
    const today = new Date();
    let totalWorkingDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, mon - 1, d);
      if (dateObj > today) continue; // don't count future days
      if (dateObj.getDay() === 0) continue; // Sunday
      const dateKey = `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (holidayDates.has(dateKey)) continue; // Holiday
      totalWorkingDays++;
    }

    // Fetch all students with profiles
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      include: { studentProfile: { include: { attendances: {
        where: { date: { gte: startDate, lte: endDate } }
      }}}}
    });

    // Build CSV rows
    const headers = [
      'Student Name',
      'Total Working Days',
      'Total Present Days',
      'Total Absent Days',
      'Total Medical Days',
      'Percentage Attendance (%)'
    ];

    const rows = students
      .filter(s => s.studentProfile)
      .map(s => {
        const profile = s.studentProfile!;
        const attendances = profile.attendances || [];
        
        let present = 0, absent = 0, medical = 0;
        for (const a of attendances) {
          if (a.status === 'PRESENT') present++;
          else if (a.status === 'ABSENT') absent++;
          else if (a.status === 'MEDICAL') medical++;
        }

        // Working days for percentage = totalWorkingDays - medical (medical off doesn't count against them)
        const effectiveWorkingDays = totalWorkingDays - medical;
        const percentage = effectiveWorkingDays > 0 
          ? Math.round((present / effectiveWorkingDays) * 100) 
          : 0;

        return [
          s.name,
          totalWorkingDays,
          present,
          absent,
          medical,
          percentage
        ];
      });

    // Generate CSV content
    const monthName = new Date(year, mon - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    let csv = `Attendance Report - ${monthName}\n`;
    csv += `Note: 'M' = Medical, 'H' = Holiday (Included in calculation)\n\n`;
    csv += headers.join(',') + '\n';
    for (const row of rows) {
      csv += row.map(cell => {
        const str = String(cell);
        // Escape commas and quotes in CSV
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',') + '\n';
    }

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="attendance_${month}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

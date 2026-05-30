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
    const monthStart = new Date(year, mon - 1, 1);
    const monthEnd = new Date(year, mon, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(year, mon, 0).getDate();

    // Fetch all holidays for the month
    const holidays = await prisma.holiday.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } }
    });
    const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]));

    // Helper: count working days (Mon–Sat, non-holiday) between two dates (inclusive)
    function countWorkingDays(from: Date, to: Date): number {
      let count = 0;
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 0) continue; // Skip Sundays
        const dateKey = d.toISOString().split('T')[0];
        if (holidayDates.has(dateKey)) continue; // Skip holidays
        count++;
      }
      return count;
    }

    // Fetch all students with profiles including courseStartDate and attendances
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      include: {
        studentProfile: {
          include: {
            attendances: {
              where: { date: { gte: monthStart, lte: monthEnd } }
            }
          }
        }
      }
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

        // Determine the effective start: max(courseStartDate, monthStart)
        let effectiveStart = monthStart;
        if (profile.courseStartDate) {
          const csd = new Date(profile.courseStartDate);
          csd.setHours(0, 0, 0, 0);
          if (csd > monthStart) {
            effectiveStart = csd;
          }
        }

        // Total working days: from effective start → end of month
        const totalWorkingDays = countWorkingDays(effectiveStart, monthEnd);

        let present = 0, absent = 0, medical = 0;
        for (const a of attendances) {
          if (a.status === 'PRESENT') present++;
          else if (a.status === 'ABSENT') absent++;
          else if (a.status === 'MEDICAL') medical++;
        }

        // Effective working days for percentage = totalWorkingDays - medical
        // (medical days don't count against the student)
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
    csv += `Note: Working days counted from each student's course start date to end of month. 'M' = Medical (excused), 'H' = Holiday\n\n`;
    csv += headers.join(',') + '\n';
    for (const row of rows) {
      csv += row.map(cell => {
        const str = String(cell);
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

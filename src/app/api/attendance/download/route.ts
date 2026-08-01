import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// GET: Download attendance report as CSV for a given month
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // YYYY-MM

    if (!month) {
      return NextResponse.json({ error: 'month parameter is required (YYYY-MM)' }, { status: 400 });
    }

    const [year, mon] = month.split('-').map(Number);
    // Use UTC boundaries to match how dates are stored in DB
    const monthStart = new Date(Date.UTC(year, mon - 1, 1));
    const monthEnd   = new Date(Date.UTC(year, mon, 0, 23, 59, 59, 999));

    // Fetch all holidays for the month
    const holidays = await prisma.holiday.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } }
    });
    const holidayDates = new Set(holidays.map((h: any) => h.date.toISOString().split('T')[0]));

    // Helper: count working days (Mon–Sat, non-holiday) in UTC between two dates inclusive
    function countWorkingDays(from: Date, to: Date): number {
      let count = 0;
      const cursor = new Date(from);
      cursor.setUTCHours(0, 0, 0, 0);
      while (cursor <= to) {
        const dow = cursor.getUTCDay();
        const dk  = cursor.toISOString().split('T')[0];
        if (dow !== 0 && !holidayDates.has(dk)) count++;
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      return count;
    }

    // Extract auth token to check if FACULTY
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    let userRole = null;
    let userId   = null;
    if (token) {
      try {
        const decoded = JSON.parse(decodeURIComponent(token));
        userRole = decoded.role;
        userId   = decoded.id;
      } catch (e) {}
    }

    let facultyLab = null;
    if (userRole === 'FACULTY' && userId) {
      const faculty = await prisma.facultyProfile.findUnique({
        where: { userId },
        include: { lab: true }
      });
      if (faculty?.lab?.name) facultyLab = faculty.lab.name;
    }

    // Fetch students with their full-month attendances
    const studentWhere: any = { role: 'STUDENT' };
    if (facultyLab) studentWhere.studentProfile = { labNumber: facultyLab };

    const students = await prisma.user.findMany({
      where: studentWhere,
      include: {
        studentProfile: {
          include: {
            attendances: {
              where: { date: { gte: monthStart, lte: monthEnd } }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Build CSV
    const monthName = new Date(year, mon - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const headers = [
      'Admission No',
      'Student Name',
      'Lab',
      'Batch',
      'Course Start Date',
      'Working Days (This Month)',
      'Present',
      'Absent',
      'Medical',
      'Attendance % (This Month)'
    ];

    const rows = students
      .filter((s: any) => s.studentProfile)
      .map((s: any) => {
        const profile = s.studentProfile;
        const attendances = profile.attendances || [];

        // Effective start: max(courseStartDate, monthStart)
        let effStart = monthStart;
        if (profile.courseStartDate) {
          const csd = new Date(profile.courseStartDate);
          csd.setUTCHours(0, 0, 0, 0);
          if (csd > monthStart) effStart = csd;
        }

        const totalWorkingDays = countWorkingDays(effStart, monthEnd);

        let present = 0, absent = 0, medical = 0;
        for (const a of attendances) {
          if (a.status === 'PRESENT') present++;
          else if (a.status === 'ABSENT') absent++;
          else if (a.status === 'MEDICAL') medical++;
        }

        // Percentage = present / (working days - medical) since medical is excused
        const effectiveDays = totalWorkingDays - medical;
        const percentage = effectiveDays > 0 ? Math.round((present / effectiveDays) * 100) : 0;

        const csd = profile.courseStartDate
          ? new Date(profile.courseStartDate).toISOString().split('T')[0]
          : 'N/A';

        return [
          profile.admissionNo || 'N/A',
          s.name,
          profile.labNumber || 'N/A',
          profile.batch || 'N/A',
          csd,
          totalWorkingDays,
          present,
          absent,
          medical,
          `${percentage}%`
        ];
      });

    let csv = `Attendance Report - ${monthName}\n`;
    csv += `Formula: Attendance % = (Present Days / Working Days) x 100  |  Working Days = Mon-Sat excluding holidays  |  Medical days are excused\n\n`;
    csv += headers.join(',') + '\n';
    for (const row of rows) {
      csv += row.map((cell: any) => {
        const str = String(cell);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"` : str;
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

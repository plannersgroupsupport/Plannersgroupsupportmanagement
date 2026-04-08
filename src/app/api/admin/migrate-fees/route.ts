import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const students = await prisma.studentProfile.findMany({
      where: {
        totalCourseFee: null
      }
    });

    let updatedCount = 0;
    for (const student of students) {
      const defaultFee = student.packageType === 'PREMIUM' ? 65000 : 35000;
      await prisma.studentProfile.update({
        where: { id: student.id },
        data: { totalCourseFee: defaultFee }
      });
      updatedCount++;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Migration complete. Updated ${updatedCount} students.`,
      updatedCount 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

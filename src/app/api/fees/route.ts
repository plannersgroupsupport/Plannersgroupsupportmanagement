import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Verify the user exists
    const user = await prisma.user.findUnique({ where: { id: data.studentId } });
    if (!user) {
        return NextResponse.json({ error: 'Student not found in database' }, { status: 404 });
    }

    const feeRecord = await prisma.feePayment.create({
      data: {
        userId: user.id,
        amount: Number(data.amount) || 10000,
        month: data.month,
        status: data.status || 'PAID',
      }
    });

    return NextResponse.json({ success: true, record: feeRecord });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId');
  
  if (studentId) {
    const records = await prisma.feePayment.findMany({ where: { userId: studentId }});
    return NextResponse.json(records);
  }
  
  return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    await prisma.feePayment.delete({
      where: { id: id }
    });

    return NextResponse.json({ success: true, message: 'Payment record removed successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

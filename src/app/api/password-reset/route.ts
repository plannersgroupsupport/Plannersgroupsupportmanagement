import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { admissionNo, fullName, loginId, phoneNumber } = data;

    if (!admissionNo || !fullName || !loginId || !phoneNumber) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    const request = await (prisma as any).passwordResetRequest.create({
      data: {
        admissionNo,
        fullName,
        loginId,
        phoneNumber,
        status: 'PENDING'
      }
    });

    return NextResponse.json({ success: true, id: request.id });
  } catch (error: any) {
    console.error('Password reset request error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const requests = await (prisma as any).passwordResetRequest.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch requests.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, status } = await req.json();
    const updated = await (prisma as any).passwordResetRequest.update({
      where: { id },
      data: { status }
    });
    return NextResponse.json({ success: true, updated });
  } catch (error) {
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    await (prisma as any).passwordResetRequest.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Deletion failed.' }, { status: 500 });
  }
}

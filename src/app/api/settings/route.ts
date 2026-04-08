import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let settings = await prisma.systemSettings.findUnique({
      where: { id: 'singleton' }
    });

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: 'singleton', companyName: 'Planners Group' }
      });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Incoming Settings Update:', body);
    const { companyName, logoUrl } = body;

    const settings = await prisma.systemSettings.upsert({
      where: { id: 'singleton' },
      update: { companyName, logoUrl },
      create: { id: 'singleton', companyName: companyName || 'Planners Group', logoUrl }
    });

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

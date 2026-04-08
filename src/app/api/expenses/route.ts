import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// GET: Fetch all expenses and total revenue using raw SQL
export async function GET() {
  try {
    const [expenses, revenueData]: [any[], any[]] = await Promise.all([
      prisma.$queryRawUnsafe(`SELECT * FROM Expense ORDER BY date DESC`),
      prisma.$queryRawUnsafe(`SELECT SUM(amount) as total FROM FeePayment`)
    ]);

    const totalRevenue = revenueData[0]?.total || 0;
    
    return NextResponse.json({ expenses, totalRevenue });
  } catch (err: any) {
    console.error('Raw SQL Fetch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Add a new expense using raw SQL
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { title, category, amount, date, description } = data;

    if (!title || !amount) {
      return NextResponse.json({ error: 'Title and amount are required' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const expenseDate = date ? new Date(date).toISOString() : now;
    const amountVal = parseFloat(amount);

    await prisma.$executeRawUnsafe(
      `INSERT INTO Expense (id, title, category, amount, date, description, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id, title, category || 'General', amountVal, expenseDate, description || '', now, now
    );

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error('Raw SQL Save error:', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// DELETE: Remove an expense
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await prisma.$executeRawUnsafe(`DELETE FROM Expense WHERE id = ?`, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch all expenses and total revenue
export async function GET() {
  try {
    const [expenses, revenueData] = await Promise.all([
      prisma.expense.findMany({
        orderBy: { date: 'desc' }
      }),
      prisma.feePayment.aggregate({
        _sum: { amount: true },
        where: { status: 'PAID' } // Assuming we only count PAID fees towards revenue
      })
    ]);

    const totalRevenue = revenueData._sum.amount || 0;
    
    return NextResponse.json({ expenses, totalRevenue });
  } catch (err: any) {
    console.error('Fetch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Add a new expense
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { title, category, amount, date, description } = data;

    if (!title || !amount) {
      return NextResponse.json({ error: 'Title and amount are required' }, { status: 400 });
    }

    const expenseDate = date ? new Date(date) : new Date();
    const amountVal = parseFloat(amount);

    const newExpense = await prisma.expense.create({
      data: {
        title,
        category: category || 'General',
        amount: amountVal,
        date: expenseDate,
        description: description || ''
      }
    });

    return NextResponse.json({ success: true, id: newExpense.id });
  } catch (err: any) {
    console.error('Save error:', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// DELETE: Remove an expense
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await prisma.expense.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

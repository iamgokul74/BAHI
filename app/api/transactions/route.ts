import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { recalculateAndPersistScore } from '@/lib/scoring/service';
import { logAuditEvent } from '@/lib/audit/logger';
import { z } from 'zod';

const AddTxSchema = z.object({
  date: z.string(),
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().default('Other'),
  balance: z.number().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');

    // Check authorization: if targetUserId is different from session.userId, user must be LENDER or ADMIN
    let effectiveUserId = session.userId;
    if (targetUserId && targetUserId !== session.userId) {
      if (session.role !== 'LENDER' && session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      effectiveUserId = targetUserId;
    }

    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;

    const [transactions, totalCount] = await Promise.all([
      db.transaction.findMany({
        where: { userId: effectiveUserId },
        orderBy: { date: 'desc' },
        take: limit,
        skip,
      }),
      db.transaction.count({ where: { userId: effectiveUserId } }),
    ]);

    const formatted = transactions.map((t) => ({
      id: t.id,
      date: t.date.toISOString().split('T')[0],
      description: t.description,
      amount: t.amount,
      type: t.type.toLowerCase() as 'income' | 'expense',
      category: t.category,
      balance: t.balance,
      referenceId: t.referenceId,
    }));

    return NextResponse.json({
      transactions: formatted,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    console.error('Fetch transactions error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = AddTxSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }

    const { date, description, amount, type, category, balance } = parsed.data;
    const txDate = new Date(date);

    // Compute balance if omitted
    let finalBalance = balance;
    if (finalBalance === undefined) {
      const latestTx = await db.transaction.findFirst({
        where: { userId: session.userId },
        orderBy: { date: 'desc' },
      });
      const prevBal = latestTx ? latestTx.balance : 1000;
      finalBalance = type === 'INCOME' ? prevBal + amount : Math.max(0, prevBal - amount);
    }

    const newTx = await db.transaction.create({
      data: {
        userId: session.userId,
        date: txDate,
        description,
        amount,
        type,
        category,
        balance: finalBalance,
        referenceId: `${date}_${amount}_${type}_MANUAL_${Date.now()}`,
      },
    });

    // Recalculate score
    const scoreSummary = await recalculateAndPersistScore(session.userId, 'TRANSACTIONS_IMPORTED');

    return NextResponse.json({
      success: true,
      transaction: newTx,
      score: scoreSummary.score,
    });
  } catch (error: any) {
    console.error('Add transaction error:', error);
    return NextResponse.json({ error: 'Failed to add transaction' }, { status: 500 });
  }
}

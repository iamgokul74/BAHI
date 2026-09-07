import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { computeCashFlowMetrics } from '@/lib/scoring/service';
import type { Transaction as AppTransaction } from '@/types';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'LENDER' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Lender access required' }, { status: 403 });
    }

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      include: {
        profile: true,
        transactions: { orderBy: { date: 'desc' } },
        bahiScores: { orderBy: { calculatedAt: 'desc' }, take: 5 },
        creditApplications: { orderBy: { createdAt: 'desc' } },
        loans: {
          orderBy: { createdAt: 'desc' },
          include: { repayments: { orderBy: { paidAt: 'desc' } } },
        },
        riskEvents: { orderBy: { createdAt: 'desc' } },
        scoreHistories: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });
    }

    const appTxns: AppTransaction[] = user.transactions.map((t) => ({
      id: t.id,
      date: t.date.toISOString().split('T')[0],
      description: t.description,
      amount: t.amount,
      type: t.type.toLowerCase() as 'income' | 'expense',
      category: t.category,
      balance: t.balance,
    }));

    const metrics = computeCashFlowMetrics(appTxns);

    return NextResponse.json({
      applicant: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile: user.profile,
        scores: user.bahiScores,
        latestScore: user.bahiScores[0] || null,
        metrics,
        transactions: appTxns,
        applications: user.creditApplications,
        loans: user.loans,
        riskEvents: user.riskEvents,
        scoreHistories: user.scoreHistories,
      },
    });
  } catch (error: any) {
    console.error('Fetch applicant detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch applicant details' }, { status: 500 });
  }
}

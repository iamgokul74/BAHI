import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { computeCashFlowMetrics } from '@/lib/scoring/service';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
      include: {
        profile: true,
        bahiScores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
        loans: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { repayments: { orderBy: { paidAt: 'desc' } } },
        },
        creditApplications: { orderBy: { createdAt: 'desc' }, take: 1 },
        riskEvents: { where: { isResolved: false } },
        scoreHistories: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Get basic stats
    const txnCount = await db.transaction.count({ where: { userId: user.id } });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profile: user.profile,
        currentScore: user.bahiScores[0] || null,
        activeLoan: user.loans[0] || null,
        latestApplication: user.creditApplications[0] || null,
        riskEvents: user.riskEvents,
        scoreHistories: user.scoreHistories,
        transactionCount: txnCount,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

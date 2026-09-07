import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');

    let effectiveUserId = session.userId;
    if (targetUserId && targetUserId !== session.userId) {
      if (session.role !== 'LENDER' && session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      effectiveUserId = targetUserId;
    }

    const loans = await db.loan.findMany({
      where: { userId: effectiveUserId },
      orderBy: { createdAt: 'desc' },
      include: {
        application: true,
        repayments: { orderBy: { paidAt: 'desc' } },
      },
    });

    return NextResponse.json({ loans });
  } catch (error: any) {
    console.error('Fetch loans error:', error);
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
  }
}

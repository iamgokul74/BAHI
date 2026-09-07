import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'LENDER' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Lender access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const riskFilter = searchParams.get('risk') || 'ALL';
    const sortBy = searchParams.get('sortBy') || 'SCORE_DESC';

    // Fetch all borrowers with their latest scores, profile, applications, and risk events
    const borrowers = await db.user.findMany({
      where: {
        role: 'BORROWER',
        OR: search
          ? [
              { name: { contains: search } },
              { email: { contains: search } },
              { profile: { occupation: { contains: search } } },
              { profile: { city: { contains: search } } },
            ]
          : undefined,
      },
      include: {
        profile: true,
        bahiScores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
        creditApplications: { orderBy: { createdAt: 'desc' }, take: 1 },
        loans: { orderBy: { createdAt: 'desc' }, take: 1 },
        riskEvents: { where: { isResolved: false } },
        _count: { select: { transactions: true } },
      },
    });

    const formatted = borrowers.map((b) => {
      const scoreObj = b.bahiScores[0];
      const app = b.creditApplications[0];
      const loan = b.loans[0];
      const unresolvedRisks = b.riskEvents;

      let riskLevel = 'LOW';
      if (unresolvedRisks.some((r) => r.severity === 'HIGH' || r.severity === 'CRITICAL')) {
        riskLevel = 'HIGH';
      } else if (scoreObj && scoreObj.score < 600) {
        riskLevel = 'MODERATE';
      } else if (b.profile?.coldStartStatus === 'BUILDING_PROFILE') {
        riskLevel = 'MODERATE';
      }

      return {
        id: b.id,
        name: b.name,
        email: b.email,
        occupation: b.profile?.occupation || 'Worker',
        city: b.profile?.city || 'Bengaluru',
        phone: b.profile?.phone || 'N/A',
        profileAgeDays: b.profile?.profileAgeDays || 0,
        coldStartStatus: b.profile?.coldStartStatus || 'COLD_START',
        starterEligibility: b.profile?.starterEligibility || 0,
        transactionCount: b._count.transactions,
        score: scoreObj
          ? {
              total: scoreObj.score,
              consistency: scoreObj.consistencyScore,
              recentActivity: scoreObj.recentActivityScore,
              incomeTrend: scoreObj.incomeTrendScore,
              cashBuffer: scoreObj.cashBufferScore,
              integrity: scoreObj.integrityScore,
              grade: scoreObj.grade,
              calculatedAt: scoreObj.calculatedAt,
            }
          : null,
        riskLevel,
        riskEventsCount: unresolvedRisks.length,
        riskEvents: unresolvedRisks,
        latestApplication: app
          ? {
              id: app.id,
              requestedAmount: app.requestedAmount,
              purpose: app.purpose,
              status: app.status,
              riskLevel: app.riskLevel,
              recommendedLimit: app.recommendedLimit,
              createdAt: app.createdAt,
            }
          : null,
        activeLoan:
          loan && loan.status === 'ACTIVE'
            ? {
                id: loan.id,
                principal: loan.principal,
                outstandingAmount: loan.outstandingAmount,
                dueDate: loan.dueDate,
                status: loan.status,
              }
            : null,
      };
    });

    // Apply risk filter
    let filtered = formatted;
    if (riskFilter !== 'ALL') {
      filtered = filtered.filter((a) => a.riskLevel.toUpperCase() === riskFilter.toUpperCase());
    }

    // Apply sorting
    if (sortBy === 'SCORE_DESC') {
      filtered.sort((a, b) => (b.score?.total || 0) - (a.score?.total || 0));
    } else if (sortBy === 'SCORE_ASC') {
      filtered.sort((a, b) => (a.score?.total || 0) - (b.score?.total || 0));
    } else if (sortBy === 'DATE_DESC') {
      filtered.sort((a, b) => b.profileAgeDays - a.profileAgeDays);
    }

    return NextResponse.json({ applicants: filtered });
  } catch (error: any) {
    console.error('Lender applicants error:', error);
    return NextResponse.json({ error: 'Failed to fetch applicants' }, { status: 500 });
  }
}

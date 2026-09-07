import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { logAuditEvent } from '@/lib/audit/logger';
import { z } from 'zod';

const ApplySchema = z.object({
  requestedAmount: z.number().positive('Amount must be positive'),
  purpose: z.string().min(3, 'Please describe your purpose'),
  tenureWeeks: z.number().int().min(1).max(52).default(4),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const applications = await db.creditApplication.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        loan: {
          include: {
            repayments: { orderBy: { paidAt: 'desc' } },
          },
        },
      },
    });

    return NextResponse.json({ applications });
  } catch (error: any) {
    console.error('Fetch applications error:', error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ApplySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }

    const { requestedAmount, purpose, tenureWeeks } = parsed.data;

    // Fetch user's latest score & profile to check eligibility
    const [user, latestScore] = await Promise.all([
      db.user.findUnique({
        where: { id: session.userId },
        include: { profile: true, riskEvents: { where: { isResolved: false } } },
      }),
      db.bahiScore.findFirst({
        where: { userId: session.userId },
        orderBy: { calculatedAt: 'desc' },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check active existing pending/approved loans
    const existingActiveLoan = await db.loan.findFirst({
      where: { userId: session.userId, status: 'ACTIVE' },
    });

    if (existingActiveLoan) {
      return NextResponse.json(
        { error: 'You already have an active loan. Please repay your current advance before applying for another.' },
        { status: 400 }
      );
    }

    // Determine risk level and limits
    const isColdStart = (user.profile?.profileAgeDays || 0) < 21;
    const hasCriticalRisk = user.riskEvents.some((r) => r.severity === 'HIGH' || r.severity === 'CRITICAL');
    const scoreVal = latestScore?.score || 400;

    let riskLevel = 'MODERATE';
    if (hasCriticalRisk || scoreVal < 550) riskLevel = 'HIGH';
    else if (scoreVal >= 700 && !isColdStart) riskLevel = 'LOW';

    const maxAllowed = user.profile?.starterEligibility || 2000;
    if (requestedAmount > maxAllowed && !hasCriticalRisk && scoreVal < 700) {
      return NextResponse.json(
        {
          error: `Requested amount exceeds your current verified limit of ₹${maxAllowed.toLocaleString('en-IN')}`,
          recommendedLimit: maxAllowed,
        },
        { status: 400 }
      );
    }

    const application = await db.creditApplication.create({
      data: {
        userId: session.userId,
        requestedAmount,
        purpose,
        tenureWeeks,
        status: 'PENDING',
        riskLevel,
        recommendedLimit: maxAllowed,
        lenderNotes: isColdStart ? 'Cold-start profile building' : undefined,
      },
    });

    await logAuditEvent({
      userId: session.userId,
      actorEmail: session.email,
      actorRole: session.role,
      action: 'CREDIT_APPLICATION_CREATED',
      entity: 'APPLICATION',
      entityId: application.id,
      metadata: { requestedAmount, purpose, tenureWeeks, riskLevel },
    });

    return NextResponse.json({
      success: true,
      application,
      message: 'Application submitted successfully. Awaiting review.',
    });
  } catch (error: any) {
    console.error('Credit application submission error:', error);
    return NextResponse.json({ error: 'Failed to submit credit application' }, { status: 500 });
  }
}

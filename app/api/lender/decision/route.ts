import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { logAuditEvent } from '@/lib/audit/logger';
import { z } from 'zod';

const DecisionSchema = z.object({
  applicationId: z.string().min(1),
  decision: z.enum(['APPROVED', 'REJECTED', 'UNDER_REVIEW']),
  notes: z.string().optional(),
  customLimit: z.number().positive().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'LENDER' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Lender access required' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = DecisionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }

    const { applicationId, decision, notes, customLimit } = parsed.data;

    const application = await db.creditApplication.findUnique({
      where: { id: applicationId },
      include: { user: { include: { profile: true } } },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Atomic transaction for state transition & loan disbursement
    const result = await db.$transaction(async (tx) => {
      const updatedApp = await tx.creditApplication.update({
        where: { id: applicationId },
        data: {
          status: decision,
          lenderNotes: notes || application.lenderNotes,
          reviewedBy: session.email,
          reviewedAt: new Date(),
          recommendedLimit: customLimit ?? application.recommendedLimit,
        },
      });

      let createdLoan = null;

      if (decision === 'APPROVED') {
        const principal = customLimit || application.requestedAmount;
        const interestFee = Math.round(principal * 0.03);
        const totalPayable = principal + interestFee;
        const tenureWeeks = application.tenureWeeks || 4;
        const weeklyInstallment = Math.round((totalPayable / tenureWeeks) * 100) / 100;
        const dueDate = new Date(Date.now() + tenureWeeks * 7 * 24 * 60 * 60 * 1000);

        createdLoan = await tx.loan.create({
          data: {
            applicationId: application.id,
            userId: application.userId,
            principal,
            interestFee,
            totalPayable,
            outstandingAmount: totalPayable,
            tenureWeeks,
            weeklyInstallment,
            status: 'ACTIVE',
            dueDate,
            disbursedAt: new Date(),
          },
        });
      }

      return { updatedApp, createdLoan };
    });

    // Audit logs
    if (decision === 'APPROVED' && result.createdLoan) {
      await logAuditEvent({
        userId: application.userId,
        actorEmail: session.email,
        actorRole: session.role,
        action: 'APPLICATION_APPROVED',
        entity: 'APPLICATION',
        entityId: application.id,
        metadata: { principal: result.createdLoan.principal, totalPayable: result.createdLoan.totalPayable },
      });

      await logAuditEvent({
        userId: application.userId,
        actorEmail: session.email,
        actorRole: session.role,
        action: 'LOAN_CREATED',
        entity: 'LOAN',
        entityId: result.createdLoan.id,
        metadata: { principal: result.createdLoan.principal, totalPayable: result.createdLoan.totalPayable },
      });
    } else if (decision === 'REJECTED') {
      await logAuditEvent({
        userId: application.userId,
        actorEmail: session.email,
        actorRole: session.role,
        action: 'APPLICATION_REJECTED',
        entity: 'APPLICATION',
        entityId: application.id,
        metadata: { reason: notes },
      });
    } else {
      await logAuditEvent({
        userId: application.userId,
        actorEmail: session.email,
        actorRole: session.role,
        action: 'APPLICATION_UNDER_REVIEW',
        entity: 'APPLICATION',
        entityId: application.id,
        metadata: { notes },
      });
    }

    return NextResponse.json({
      success: true,
      application: result.updatedApp,
      loan: result.createdLoan,
      message: `Application marked as ${decision}`,
    });
  } catch (error: any) {
    console.error('Lender decision error:', error);
    return NextResponse.json({ error: 'Failed to process decision' }, { status: 500 });
  }
}

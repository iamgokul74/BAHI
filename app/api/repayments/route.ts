import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { recalculateAndPersistScore } from '@/lib/scoring/service';
import { logAuditEvent } from '@/lib/audit/logger';
import { z } from 'zod';

const RepaySchema = z.object({
  loanId: z.string().min(1),
  amount: z.number().positive('Repayment amount must be strictly positive'),
  paymentMethod: z.enum(['UPI', 'BANK_TRANSFER', 'CASH_COLLECTION']).default('UPI'),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = RepaySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }

    const { loanId, amount, paymentMethod, notes } = parsed.data;

    // Fetch loan
    const loan = await db.loan.findUnique({
      where: { id: loanId },
      include: { user: true },
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // IDOR Protection: only borrower owner, lender, or admin can service loan
    if (loan.userId !== session.userId && session.role !== 'LENDER' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to service this loan' }, { status: 403 });
    }

    if (loan.status === 'COMPLETED' || loan.outstandingAmount <= 0) {
      return NextResponse.json({ error: 'This loan is already fully settled and marked COMPLETED' }, { status: 400 });
    }

    const prevOutstanding = loan.outstandingAmount;
    const actualPayAmount = Math.min(amount, prevOutstanding);
    const newOutstanding = Math.max(0, Math.round((prevOutstanding - actualPayAmount) * 100) / 100);
    const isFullyRepaid = newOutstanding === 0;

    const paymentRef = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Atomic transaction for repayment & loan state update
    const { repayment, updatedLoan } = await db.$transaction(async (tx) => {
      const rep = await tx.repayment.create({
        data: {
          loanId: loan.id,
          userId: loan.userId,
          amount: actualPayAmount,
          paymentMethod,
          paymentReference: paymentRef,
          status: 'COMPLETED',
          previousOutstanding: prevOutstanding,
          newOutstanding,
          notes: notes || (isFullyRepaid ? 'Full loan repayment' : 'Partial installment payment'),
        },
      });

      const updated = await tx.loan.update({
        where: { id: loan.id },
        data: {
          outstandingAmount: newOutstanding,
          status: isFullyRepaid ? 'COMPLETED' : 'ACTIVE',
          completedAt: isFullyRepaid ? new Date() : null,
        },
      });

      return { repayment: rep, updatedLoan: updated };
    });

    await logAuditEvent({
      userId: loan.userId,
      actorEmail: session.email,
      actorRole: session.role,
      action: 'REPAYMENT_CREATED',
      entity: 'REPAYMENT',
      entityId: repayment.id,
      metadata: {
        loanId: loan.id,
        amount: actualPayAmount,
        prevOutstanding,
        newOutstanding,
        isFullyRepaid,
      },
    });

    if (isFullyRepaid) {
      await logAuditEvent({
        userId: loan.userId,
        actorEmail: session.email,
        actorRole: session.role,
        action: 'LOAN_COMPLETED',
        entity: 'LOAN',
        entityId: loan.id,
        metadata: { totalPaid: loan.totalPayable },
      });
    }

    // Trigger score evolution and recalculation
    const newScoreResult = await recalculateAndPersistScore(loan.userId, 'REPAYMENT_COMPLETED');

    return NextResponse.json({
      success: true,
      repayment,
      loan: updatedLoan,
      isFullyRepaid,
      scoreEvolution: {
        newScore: newScoreResult.score.score,
        grade: newScoreResult.score.grade,
        starterEligibility: newScoreResult.starterEligibility,
      },
      message: isFullyRepaid
        ? 'Loan fully settled! Your Bahi Score has been upgraded with positive repayment history.'
        : `Payment of ₹${actualPayAmount.toLocaleString('en-IN')} recorded successfully. Remaining balance: ₹${newOutstanding.toLocaleString('en-IN')}`,
    });
  } catch (error: any) {
    console.error('Repayment processing error:', error);
    return NextResponse.json({ error: 'Failed to record repayment' }, { status: 500 });
  }
}

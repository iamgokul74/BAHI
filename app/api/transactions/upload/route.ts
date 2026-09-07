import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { parseTransactionCsv } from '@/lib/csv/parser';
import { recalculateAndPersistScore } from '@/lib/scoring/service';
import { logAuditEvent } from '@/lib/audit/logger';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let csvContent = '';
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
      }
      csvContent = await file.text();
    } else {
      const body = await req.json();
      csvContent = body.csvContent || '';
    }

    if (!csvContent.trim()) {
      return NextResponse.json({ error: 'CSV content is empty' }, { status: 400 });
    }

    // Fetch existing transaction reference hashes for duplicate detection
    const existingTxns = await db.transaction.findMany({
      where: { userId: session.userId },
      select: { referenceId: true },
    });
    const existingRefs = new Set(existingTxns.map((t) => t.referenceId).filter(Boolean) as string[]);

    // Parse CSV
    const parseResult = parseTransactionCsv(csvContent, existingRefs);

    if (parseResult.validTransactions.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid transactions found in CSV',
          summary: {
            imported: 0,
            rejected: parseResult.rejectedCount,
            duplicates: parseResult.duplicateCount,
            errors: parseResult.errors,
          },
        },
        { status: 422 }
      );
    }

    // Insert valid transactions into DB
    const txData = parseResult.validTransactions.map((t) => ({
      userId: session.userId,
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      category: t.category,
      balance: t.balance,
      referenceId: t.referenceId,
    }));

    await db.transaction.createMany({
      data: txData,
    });

    // Recalculate score and cash flow metrics
    const scoreSummary = await recalculateAndPersistScore(session.userId, 'TRANSACTIONS_IMPORTED');

    // Audit log
    await logAuditEvent({
      userId: session.userId,
      actorEmail: session.email,
      actorRole: session.role,
      action: 'TRANSACTIONS_IMPORTED',
      entity: 'TRANSACTION',
      metadata: {
        importedCount: parseResult.importedCount,
        rejectedCount: parseResult.rejectedCount,
        duplicateCount: parseResult.duplicateCount,
        totalIncome: parseResult.totalIncome,
        totalExpenses: parseResult.totalExpenses,
        netCashFlow: parseResult.netCashFlow,
        newScore: scoreSummary.score.score,
      },
    });

    return NextResponse.json({
      success: true,
      summary: {
        imported: parseResult.importedCount,
        rejected: parseResult.rejectedCount,
        duplicates: parseResult.duplicateCount,
        totalIncome: parseResult.totalIncome,
        totalExpenses: parseResult.totalExpenses,
        netCashFlow: parseResult.netCashFlow,
        errors: parseResult.errors,
      },
      score: scoreSummary.score,
      metrics: scoreSummary.metrics,
      coldStartStatus: scoreSummary.coldStartStatus,
      starterEligibility: scoreSummary.starterEligibility,
    });
  } catch (error: any) {
    console.error('CSV upload error:', error);
    return NextResponse.json({ error: 'Failed to process transaction CSV' }, { status: 500 });
  }
}

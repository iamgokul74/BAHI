import { db } from '@/lib/db';
import { calculateBahiScore, getHistoryDays } from './engine';
import { calculateCreditDecision } from '@/lib/decisions/engine';
import { analyzeFinancialBehavior } from '@/lib/intelligence/financial-intelligence.service';
import { logAuditEvent } from '@/lib/audit/logger';
import type { Transaction as AppTransaction } from '@/types';
import type { FinancialIntelligence, RepaymentTrackRecord } from '@/lib/intelligence/types';

export interface CashFlowMetrics {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  averageIncome: number;
  activeEarningDays: number;
  incomeFrequency: number;
  incomeTrend: 'GROWING' | 'STABLE' | 'DECLINING';
  averageBalance: number;
  minimumBalance: number;
  cashBuffer: number;
  transactionFrequency: number;
  historyLengthDays: number;
}

export interface DetectedRiskEvent {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  evidence: Record<string, any>;
}

export function computeCashFlowMetrics(transactions: AppTransaction[]): CashFlowMetrics {
  const intel = analyzeFinancialBehavior(transactions);
  return {
    totalIncome: intel.income.totalIncome,
    totalExpenses: intel.expenses.totalExpenses,
    netCashFlow: intel.cashFlow.netCashFlow,
    averageIncome: intel.income.averageIncomePerEarningDay,
    activeEarningDays: intel.income.activeEarningDays,
    incomeFrequency: Math.round(intel.income.incomeDayRatio * 100),
    incomeTrend: intel.income.incomeTrend,
    averageBalance: intel.cashFlow.averageBalance,
    minimumBalance: intel.cashFlow.minimumBalance,
    cashBuffer: intel.cashFlow.averageBalance,
    transactionFrequency: intel.activity.transactionFrequencyPerDay,
    historyLengthDays: intel.activity.historyLengthDays,
  };
}

export function detectAnomalies(transactions: AppTransaction[]): DetectedRiskEvent[] {
  const intel = analyzeFinancialBehavior(transactions);
  const events: DetectedRiskEvent[] = [];

  if (intel.anomalies.repeatAmountRatio >= 0.6) {
    events.push({
      type: 'REPEATED_AMOUNTS',
      severity: intel.anomalies.repeatAmountRatio >= 0.8 ? 'HIGH' : 'MEDIUM',
      description: `Excessive repetition of identical income amount (₹${intel.anomalies.dominantAmount}) across ${intel.anomalies.dominantAmountCount} transactions (${Math.round(intel.anomalies.repeatAmountRatio * 100)}%).`,
      evidence: {
        dominantAmount: intel.anomalies.dominantAmount,
        count: intel.anomalies.dominantAmountCount,
        ratio: intel.anomalies.repeatAmountRatio,
      },
    });
  }

  if (intel.anomalies.isSyntheticTimingRegularity) {
    events.push({
      type: 'SYNTHETIC_REGULARITY',
      severity: 'MEDIUM',
      description: 'Income deposits occur with rigid automated regularity. Genuine gig earnings exhibit natural variance.',
      evidence: { synthetic: true },
    });
  }

  if (intel.anomalies.hasVolumeBurst) {
    events.push({
      type: 'SUSPICIOUS_BURST',
      severity: 'LOW',
      description: 'Sudden high concentration of transaction volume in recent trailing days.',
      evidence: { burst: true },
    });
  }

  return events;
}

export async function recalculateAndPersistScore(userId: string, triggerReason = 'SYSTEM_RECALCULATION') {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      transactions: { orderBy: { date: 'asc' } },
      profile: true,
      bahiScores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
      loans: {
        include: { repayments: true },
      },
      repayments: true,
    },
  });

  if (!user) throw new Error('User not found');

  const appTxns: AppTransaction[] = user.transactions.map((t) => ({
    id: t.id,
    date: t.date.toISOString().split('T')[0],
    description: t.description,
    amount: t.amount,
    type: t.type.toLowerCase() as 'income' | 'expense',
    category: t.category,
    balance: t.balance,
  }));

  // Build real repayment track record
  const completedLoans = user.loans.filter((l) => l.status === 'COMPLETED');
  const onTimeCount = user.repayments.filter((r) => r.status === 'COMPLETED').length;
  const repaymentRecord: RepaymentTrackRecord = {
    totalLoansTaken: user.loans.length,
    completedLoansCount: completedLoans.length,
    totalPrincipalRepaid: completedLoans.reduce((sum, l) => sum + l.principal, 0),
    onTimeRepaymentsCount: onTimeCount,
    lateRepaymentsCount: 0,
    repaymentReliabilityRatio: user.loans.length > 0 ? (onTimeCount > 0 ? 1.0 : 0.8) : 1.0,
  };

  const scoreResult = calculateBahiScore(appTxns, repaymentRecord);
  const decisionResult = calculateCreditDecision(scoreResult, appTxns);
  const metrics = computeCashFlowMetrics(appTxns);
  const historyDays = scoreResult.historyDays;

  // Cold start & starter eligibility
  let coldStartStatus: 'COLD_START' | 'BUILDING_PROFILE' | 'ESTABLISHED';
  if (historyDays === 0) {
    coldStartStatus = 'COLD_START';
  } else if (historyDays < 21) {
    coldStartStatus = 'BUILDING_PROFILE';
  } else {
    coldStartStatus = 'ESTABLISHED';
  }

  const starterEligibility = decisionResult.recommendedLimit;
  const adjustedScore = scoreResult.total;

  const getFScore = (key: string) => scoreResult.factors.find((f) => f.key === key)?.score ?? 50;

  let grade = 'GOOD';
  if (adjustedScore >= 750) grade = 'EXCELLENT';
  else if (adjustedScore >= 650) grade = 'GOOD';
  else if (adjustedScore >= 550) grade = 'FAIR';
  else grade = 'CAUTION';

  // Persist BahiScore
  const savedScore = await db.bahiScore.create({
    data: {
      userId,
      score: adjustedScore,
      consistencyScore: getFScore('consistency'),
      recentActivityScore: getFScore('recentActivity'),
      incomeTrendScore: getFScore('incomeTrend'),
      cashBufferScore: getFScore('cashBuffer'),
      integrityScore: getFScore('integrity'),
      grade,
      coldStartStatus,
      historyLengthDays: historyDays,
      explanation: `Calculated deterministically from ${appTxns.length} transactions across ${historyDays} days (${scoreResult.confidence}% confidence).`,
    },
  });

  // Update Profile
  await db.profile.upsert({
    where: { userId },
    create: {
      userId,
      occupation: user.profile?.occupation || 'Gig Worker / Driver',
      businessName: user.profile?.businessName || null,
      city: user.profile?.city || 'Bengaluru',
      phone: user.profile?.phone || null,
      profileAgeDays: historyDays,
      coldStartStatus,
      starterEligibility,
    },
    update: {
      profileAgeDays: historyDays,
      coldStartStatus,
      starterEligibility,
    },
  });

  // Persist Risk Events
  const anomalies = detectAnomalies(appTxns);
  for (const anomaly of anomalies) {
    const existing = await db.riskEvent.findFirst({
      where: { userId, type: anomaly.type, isResolved: false },
    });
    if (!existing) {
      await db.riskEvent.create({
        data: {
          userId,
          type: anomaly.type,
          severity: anomaly.severity,
          description: anomaly.description,
          evidenceJson: JSON.stringify(anomaly.evidence),
        },
      });

      await logAuditEvent({
        userId,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'RISK_EVENT_CREATED',
        entity: 'RISK_EVENT',
        metadata: { type: anomaly.type, severity: anomaly.severity },
      });
    }
  }

  // Record ScoreHistory if score changed or meaningful financial event
  const previousScore = user.bahiScores[0]?.score;
  if (previousScore !== undefined && previousScore !== adjustedScore) {
    await db.scoreHistory.create({
      data: {
        userId,
        previousScore,
        newScore: adjustedScore,
        scoreChange: adjustedScore - previousScore,
        triggerReason,
        factorChangesJson: JSON.stringify(scoreResult.factors),
        eligibilityChangeJson: JSON.stringify({ starterEligibility, status: coldStartStatus }),
      },
    });
  }

  await logAuditEvent({
    userId,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'SCORE_GENERATED',
    entity: 'SCORE',
    entityId: savedScore.id,
    metadata: { score: adjustedScore, historyDays, coldStartStatus, triggerReason },
  });

  return {
    score: savedScore,
    metrics,
    scoreResult,
    decisionResult,
    coldStartStatus,
    starterEligibility,
  };
}

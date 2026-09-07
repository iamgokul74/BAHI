// ============================================================
// BAHI — Deterministic Behavioral Credit Scoring Engine
// ============================================================
// Score Range: 300 – 900
// 5 Weighted Measurable Factors:
//   1. Income Consistency            25%
//   2. Cash-Flow Stability           25%
//   3. Recent Financial Activity     15%
//   4. Cash Buffer                   20%
//   5. Financial Integrity & Credit  15%
// ============================================================

import type { Transaction, FactorScore, BahiScore } from '@/types';
import { analyzeFinancialBehavior, getHistoryDays } from '@/lib/intelligence/financial-intelligence.service';
import type { FinancialIntelligence, FactorDetail, EnhancedBahiScore, RepaymentTrackRecord } from '@/lib/intelligence/types';

export const SCORE_MIN = 300;
export const SCORE_MAX = 900;
export const SCORE_RANGE = SCORE_MAX - SCORE_MIN;

export const FACTOR_WEIGHTS = {
  consistency: 25,
  cashFlowStability: 25,
  recentActivity: 15,
  cashBuffer: 20,
  integrity: 15,
} as const;

// ── 1. Income Consistency (25%) ──────────────────────────
export function calculateConsistency(txns: Transaction[], intelligence?: FinancialIntelligence): FactorDetail {
  const intel = intelligence || analyzeFinancialBehavior(txns);
  const { income, activity } = intel;

  if (activity.totalTransactions === 0 || income.totalIncome === 0) {
    return {
      name: 'Income Consistency',
      key: 'consistency',
      score: 0,
      weight: FACTOR_WEIGHTS.consistency,
      explanation: 'No income transactions detected in statement records.',
      status: 'weak',
      formula: 'Active Earning Days Rate (60%) + Earning Regularity Coefficient (40%)',
      supportingMetrics: {
        totalIncome: `₹${income.totalIncome.toLocaleString('en-IN')}`,
        activeEarningDays: 0,
        activeDayRate: '0%',
      },
    };
  }

  // Active earning days rate (Target: 5+ days/week or ~70% of days)
  const earningDaysRatio = Math.min(1.0, income.activeEarningDays / Math.max(activity.historyLengthDays * 0.7, 1));
  const activityScore = Math.round(earningDaysRatio * 100);

  // Volatility penalty / regularity
  let regularityScore = 75;
  if (income.incomeVolatilityCv <= 0.4) {
    regularityScore = 95; // Highly consistent
  } else if (income.incomeVolatilityCv <= 0.8) {
    regularityScore = Math.round(95 - (income.incomeVolatilityCv - 0.4) * 62.5);
  } else {
    regularityScore = Math.max(20, Math.round(70 - (income.incomeVolatilityCv - 0.8) * 30));
  }

  const raw = activityScore * 0.6 + regularityScore * 0.4;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  const status: FactorScore['status'] =
    score >= 70 ? 'strong' : score >= 45 ? 'moderate' : 'weak';

  const explanation =
    score >= 70
      ? `Income recorded across ${income.activeEarningDays} of ${activity.historyLengthDays} days with steady weekly flow.`
      : score >= 45
      ? `Moderate earning frequency across ${income.activeEarningDays} active days (avg ₹${income.averageIncomePerEarningDay.toLocaleString('en-IN')}/day).`
      : `Low earning frequency — only ${income.activeEarningDays} earning days across ${activity.historyLengthDays} observed days.`;

  return {
    name: 'Income Consistency',
    key: 'consistency',
    score,
    weight: FACTOR_WEIGHTS.consistency,
    explanation,
    status,
    formula: 'Active Earning Days Rate (60%) + Earning Regularity Coefficient (40%)',
    supportingMetrics: {
      activeEarningDays: income.activeEarningDays,
      historyLengthDays: activity.historyLengthDays,
      averageDailyIncome: `₹${income.averageIncomePerEarningDay.toLocaleString('en-IN')}`,
      volatilityCv: income.incomeVolatilityCv,
    },
  };
}

// ── 2. Cash-Flow Stability (25%) ─────────────────────────
export function calculateCashFlowStability(txns: Transaction[], intelligence?: FinancialIntelligence): FactorDetail {
  const intel = intelligence || analyzeFinancialBehavior(txns);
  const { cashFlow, expenses, income } = intel;

  if (intel.activity.totalTransactions === 0) {
    return {
      name: 'Cash-Flow Stability',
      key: 'incomeTrend', // using incomeTrend key for UI backward-compat
      score: 0,
      weight: FACTOR_WEIGHTS.cashFlowStability,
      explanation: 'No cash-flow data available.',
      status: 'weak',
      formula: 'Positive Cash Flow Days (50%) + Expense Margin (30%) + Trend Stability (20%)',
      supportingMetrics: { netCashFlow: '₹0', expenseRatio: '0%' },
    };
  }

  // 1. Positive cash-flow days ratio (0-100)
  const posDaysScore = Math.round(cashFlow.positiveCashFlowDaysRatio * 100);

  // 2. Expense-to-income margin (lower expense ratio is better)
  let marginScore = 60;
  if (income.totalIncome === 0) {
    marginScore = 10;
  } else if (expenses.expenseToIncomeRatio <= 0.5) {
    marginScore = 95;
  } else if (expenses.expenseToIncomeRatio <= 0.8) {
    marginScore = Math.round(95 - ((expenses.expenseToIncomeRatio - 0.5) / 0.3) * 35);
  } else if (expenses.expenseToIncomeRatio <= 1.0) {
    marginScore = Math.round(60 - ((expenses.expenseToIncomeRatio - 0.8) / 0.2) * 30);
  } else {
    marginScore = Math.max(10, Math.round(30 - (expenses.expenseToIncomeRatio - 1.0) * 40));
  }

  // 3. Trend Stability / Growth
  let trendScore = 65;
  if (income.incomeTrend === 'GROWING') trendScore = 90;
  else if (income.incomeTrend === 'STABLE') trendScore = 75;
  else trendScore = 40;

  const raw = posDaysScore * 0.5 + marginScore * 0.3 + trendScore * 0.2;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  const status: FactorScore['status'] =
    score >= 70 ? 'strong' : score >= 45 ? 'moderate' : 'weak';

  const explanation =
    cashFlow.netCashFlow >= 0
      ? `Positive operating surplus of ₹${cashFlow.netCashFlow.toLocaleString('en-IN')} with ${Math.round(cashFlow.positiveCashFlowDaysRatio * 100)}% positive cash-flow days.`
      : `Operating deficit: expenses (₹${expenses.totalExpenses.toLocaleString('en-IN')}) exceed verified income (₹${income.totalIncome.toLocaleString('en-IN')}).`;

  return {
    name: 'Cash-Flow Stability',
    key: 'incomeTrend',
    score,
    weight: FACTOR_WEIGHTS.cashFlowStability,
    explanation,
    status,
    formula: 'Positive Cash Flow Days (50%) + Expense Margin (30%) + Trend Stability (20%)',
    supportingMetrics: {
      netCashFlow: `₹${cashFlow.netCashFlow.toLocaleString('en-IN')}`,
      expenseToIncomeRatio: `${Math.round(expenses.expenseToIncomeRatio * 100)}%`,
      incomeTrend: income.incomeTrend,
      positiveDaysRatio: `${Math.round(cashFlow.positiveCashFlowDaysRatio * 100)}%`,
    },
  };
}

// Backward-compatible alias for existing test runners
export const calculateIncomeTrend = calculateCashFlowStability;

// ── 3. Recent Activity (15%) ─────────────────────────────
export function calculateRecentActivity(txns: Transaction[], intelligence?: FinancialIntelligence): FactorDetail {
  const intel = intelligence || analyzeFinancialBehavior(txns);
  const { activity } = intel;

  if (activity.totalTransactions === 0) {
    return {
      name: 'Recent Activity',
      key: 'recentActivity',
      score: 0,
      weight: FACTOR_WEIGHTS.recentActivity,
      explanation: 'No recent activity recorded.',
      status: 'weak',
      formula: '14-Day Active Days Ratio (60%) + Recent Daily Average vs Historical Baseline (40%)',
      supportingMetrics: { recent14DaysActive: 0, recent14Income: '₹0' },
    };
  }

  // Active days in last 14 days (Target: 8+ days of 14)
  const recentDaysRate = Math.min(1.0, activity.recent14DayActiveDays / 10);
  const activityScore = Math.round(recentDaysRate * 100);

  // Velocity ratio
  let velocityScore = 65;
  if (activity.recentToHistoricalVelocityRatio >= 1.1) {
    velocityScore = Math.min(100, Math.round(75 + (activity.recentToHistoricalVelocityRatio - 1) * 50));
  } else if (activity.recentToHistoricalVelocityRatio >= 0.85) {
    velocityScore = 75;
  } else {
    velocityScore = Math.max(15, Math.round(75 - (0.85 - activity.recentToHistoricalVelocityRatio) * 80));
  }

  const raw = activityScore * 0.6 + velocityScore * 0.4;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  const status: FactorScore['status'] =
    score >= 70 ? 'strong' : score >= 45 ? 'moderate' : 'weak';

  const explanation =
    activity.recent14DayActiveDays >= 7
      ? `Active on ${activity.recent14DayActiveDays} of the last 14 days with ₹${activity.recent14DayIncome.toLocaleString('en-IN')} recent income.`
      : activity.recent14DayActiveDays > 0
      ? `Recorded ${activity.recent14DayActiveDays} active days in the trailing 14-day window.`
      : 'Dormant period: zero active earning transactions in the last 14 days.';

  return {
    name: 'Recent Activity',
    key: 'recentActivity',
    score,
    weight: FACTOR_WEIGHTS.recentActivity,
    explanation,
    status,
    formula: '14-Day Active Days Ratio (60%) + Recent Daily Average vs Historical Baseline (40%)',
    supportingMetrics: {
      recent14DayActiveDays: activity.recent14DayActiveDays,
      recent14DayIncome: `₹${activity.recent14DayIncome.toLocaleString('en-IN')}`,
      velocityRatio: `${Math.round(activity.recentToHistoricalVelocityRatio * 100)}%`,
    },
  };
}

// ── 4. Cash Buffer (20%) ─────────────────────────────────
export function calculateCashBuffer(txns: Transaction[], intelligence?: FinancialIntelligence): FactorDetail {
  const intel = intelligence || analyzeFinancialBehavior(txns);
  const { cashFlow } = intel;

  if (intel.activity.totalTransactions === 0) {
    return {
      name: 'Cash Buffer',
      key: 'cashBuffer',
      score: 0,
      weight: FACTOR_WEIGHTS.cashBuffer,
      explanation: 'No balance data available.',
      status: 'weak',
      formula: 'Average Balance / Monthly Operating Need (Target: 0.5+ Months Operating Reserve)',
      supportingMetrics: { averageBalance: '₹0', bufferDays: 0 },
    };
  }

  // Handle negative balances strictly
  if (cashFlow.averageBalance <= 0 || cashFlow.minimumBalance < 0) {
    const minBalPenalty = cashFlow.minimumBalance < 0 ? 15 : 25;
    return {
      name: 'Cash Buffer',
      key: 'cashBuffer',
      score: minBalPenalty,
      weight: FACTOR_WEIGHTS.cashBuffer,
      explanation: `Account shows overdraft/low liquidity with minimum balance of ₹${cashFlow.minimumBalance.toLocaleString('en-IN')}.`,
      status: 'weak',
      formula: 'Average Balance / Monthly Operating Need (Target: 0.5+ Months Operating Reserve)',
      supportingMetrics: {
        averageBalance: `₹${cashFlow.averageBalance.toLocaleString('en-IN')}`,
        minimumBalance: `₹${cashFlow.minimumBalance.toLocaleString('en-IN')}`,
        bufferDays: 0,
      },
    };
  }

  // Buffer score based on buffer strength (in months of operating reserves)
  // Target: >= 0.5 months is strong (80+), >= 1.0 month is 95+
  let score: number;
  if (cashFlow.cashBufferStrength >= 1.0) {
    score = Math.min(100, Math.round(90 + cashFlow.cashBufferStrength * 5));
  } else if (cashFlow.cashBufferStrength >= 0.5) {
    score = Math.round(75 + ((cashFlow.cashBufferStrength - 0.5) / 0.5) * 15);
  } else if (cashFlow.cashBufferStrength >= 0.2) {
    score = Math.round(45 + ((cashFlow.cashBufferStrength - 0.2) / 0.3) * 30);
  } else {
    score = Math.max(15, Math.round(cashFlow.cashBufferStrength * 225));
  }

  score = Math.max(0, Math.min(100, score));

  const status: FactorScore['status'] =
    score >= 70 ? 'strong' : score >= 45 ? 'moderate' : 'weak';

  const explanation =
    score >= 70
      ? `Healthy cash buffer of ₹${cashFlow.averageBalance.toLocaleString('en-IN')} (~${cashFlow.cashBufferDays} days operating runway).`
      : score >= 45
      ? `Moderate liquidity buffer of ₹${cashFlow.averageBalance.toLocaleString('en-IN')} (~${cashFlow.cashBufferDays} days runway).`
      : `Constrained buffer of ₹${cashFlow.averageBalance.toLocaleString('en-IN')} (~${cashFlow.cashBufferDays} days runway) limiting buffer resilience.`;

  return {
    name: 'Cash Buffer',
    key: 'cashBuffer',
    score,
    weight: FACTOR_WEIGHTS.cashBuffer,
    explanation,
    status,
    formula: 'Average Balance / Monthly Operating Need (Target: 0.5+ Months Operating Reserve)',
    supportingMetrics: {
      averageBalance: `₹${cashFlow.averageBalance.toLocaleString('en-IN')}`,
      minimumBalance: `₹${cashFlow.minimumBalance.toLocaleString('en-IN')}`,
      bufferStrengthMonths: cashFlow.cashBufferStrength,
      bufferDays: cashFlow.cashBufferDays,
    },
  };
}

// ── 5. Financial Integrity & Repayment Track Record (15%) ─
export function calculateIntegrity(txns: Transaction[], intelligence?: FinancialIntelligence): FactorDetail {
  const intel = intelligence || analyzeFinancialBehavior(txns);
  const { anomalies, repaymentRecord } = intel;

  if (intel.activity.totalTransactions === 0) {
    return {
      name: 'Integrity & Credit Track',
      key: 'integrity',
      score: 60,
      weight: FACTOR_WEIGHTS.integrity,
      explanation: 'Insufficient transaction data for pattern and integrity verification.',
      status: 'moderate',
      formula: 'Pattern Organic Analysis - Anomaly Deductions + Repayment Reliability Bonus',
      supportingMetrics: { anomaliesCount: 0, completedLoans: 0 },
    };
  }

  let score = 90; // Base healthy score for natural accounts

  // Deduct for anomalies
  if (anomalies.repeatAmountRatio >= 0.8) score -= 50;
  else if (anomalies.repeatAmountRatio >= 0.6) score -= 35;
  else if (anomalies.repeatAmountRatio >= 0.4) score -= 15;

  if (anomalies.isSyntheticTimingRegularity) score -= 25;
  if (anomalies.hasNegativeBalanceDrop) score -= 15;

  // Reward proven on-time loan repayments
  if (repaymentRecord.completedLoansCount > 0) {
    const repaymentBonus = Math.min(15, repaymentRecord.completedLoansCount * 5);
    score += repaymentBonus;
  }

  // Penalize proven late repayments
  if (repaymentRecord.lateRepaymentsCount > 0) {
    score -= Math.min(20, repaymentRecord.lateRepaymentsCount * 8);
  }

  score = Math.max(10, Math.min(100, Math.round(score)));

  const status: FactorScore['status'] =
    score >= 70 ? 'strong' : score >= 45 ? 'moderate' : 'weak';

  const explanation =
    anomalies.flags.length > 0
      ? `Integrity alert: ${anomalies.flags[0]}`
      : repaymentRecord.completedLoansCount > 0
      ? `Verified organic transactions with ${repaymentRecord.completedLoansCount} on-time loan cycle(s) completed.`
      : 'Natural earning pattern with high transaction integrity and zero synthetic flags.';

  return {
    name: 'Integrity Check',
    key: 'integrity',
    score,
    weight: FACTOR_WEIGHTS.integrity,
    explanation,
    status,
    formula: 'Pattern Organic Analysis - Anomaly Deductions + Repayment Reliability Bonus',
    supportingMetrics: {
      anomaliesDetected: anomalies.flags.length,
      severity: anomalies.severity,
      completedLoans: repaymentRecord.completedLoansCount,
      repeatRatio: `${Math.round(anomalies.repeatAmountRatio * 100)}%`,
    },
  };
}

// ── Main Bahi Score Calculator ───────────────────────────
export function calculateBahiScore(
  txns: Transaction[],
  repaymentRecord?: Partial<RepaymentTrackRecord>
): EnhancedBahiScore {
  const intelligence = analyzeFinancialBehavior(txns, repaymentRecord);
  const historyDays = intelligence.activity.historyLengthDays;

  if (txns.length === 0) {
    const emptyFactors: FactorDetail[] = [
      calculateConsistency([], intelligence),
      calculateCashFlowStability([], intelligence),
      calculateRecentActivity([], intelligence),
      calculateCashBuffer([], intelligence),
      calculateIntegrity([], intelligence),
    ];

    return {
      total: SCORE_MIN,
      factors: emptyFactors,
      riskCategory: 'building',
      confidence: 0,
      historyDays: 0,
      lastUpdated: new Date().toISOString(),
      intelligence,
    };
  }

  const consistency = calculateConsistency(txns, intelligence);
  const cashFlowStability = calculateCashFlowStability(txns, intelligence);
  const recentActivity = calculateRecentActivity(txns, intelligence);
  const cashBuffer = calculateCashBuffer(txns, intelligence);
  const integrity = calculateIntegrity(txns, intelligence);

  const factors = [consistency, recentActivity, cashFlowStability, cashBuffer, integrity];

  // Weighted composite sum: sum(score * weight / 100) -> 0 to 100
  const weightedPercentage =
    (consistency.score * consistency.weight +
      cashFlowStability.score * cashFlowStability.weight +
      recentActivity.score * recentActivity.weight +
      cashBuffer.score * cashBuffer.weight +
      integrity.score * integrity.weight) /
    100;

  // Scale: 300 to 900
  const rawTotal = Math.round(SCORE_MIN + (weightedPercentage / 100) * SCORE_RANGE);
  const total = Math.max(SCORE_MIN, Math.min(SCORE_MAX, rawTotal));

  let riskCategory: BahiScore['riskCategory'];
  if (historyDays < 21) riskCategory = 'building';
  else if (total >= 680 && integrity.score >= 60) riskCategory = 'low';
  else if (total >= 540) riskCategory = 'medium';
  else riskCategory = 'high';

  return {
    total,
    factors,
    riskCategory,
    confidence: intelligence.confidence.confidencePercentage,
    historyDays,
    lastUpdated: new Date().toISOString(),
    intelligence,
  };
}

// ── Score Evolution Timeline Generator ───────────────────
export function generateScoreEvolution(
  txns: Transaction[],
  advance?: { date: string; repaidDate?: string }
): Array<{ date: string; score: number; event?: string }> {
  if (txns.length === 0) return [];

  const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date));
  const points: Array<{ date: string; score: number; event?: string }> = [];
  const historyDays = getHistoryDays(txns);
  const steps = Math.max(3, Math.min(10, Math.floor(historyDays / 7)));

  for (let i = 1; i <= steps; i++) {
    const fraction = i / steps;
    const txnCount = Math.max(2, Math.floor(sorted.length * fraction));
    const subset = sorted.slice(0, txnCount);
    const s = calculateBahiScore(subset);
    const date = subset[subset.length - 1]?.date || sorted[0].date;

    let event: string | undefined;
    if (advance) {
      if (date === advance.date) event = 'Advance Taken';
      if (advance.repaidDate && date >= advance.repaidDate) event = 'Repaid ✓';
    }

    points.push({ date, score: s.total, event });
  }

  return points;
}

export { getHistoryDays };

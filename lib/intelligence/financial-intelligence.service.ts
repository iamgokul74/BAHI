// ============================================================
// BAHI — Centralized Financial Behavior & Intelligence Engine
// Computes deterministic, normalized metrics from actual transactions
// ============================================================

import type { Transaction } from '@/types';
import type {
  FinancialIntelligence,
  IncomeMetrics,
  ExpenseMetrics,
  CashFlowMetrics,
  ActivityMetrics,
  AnomalyDetectionResult,
  RepaymentTrackRecord,
  DataConfidenceAssessment,
} from './types';

// ── Math Helpers ──────────────────────────────────────────
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function getHistoryDays(txns: Transaction[]): number {
  if (txns.length === 0) return 0;
  const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date));
  const first = new Date(sorted[0].date);
  const last = new Date(sorted[sorted.length - 1].date);
  return Math.max(1, Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

const ESSENTIAL_CATEGORIES = new Set([
  'fuel',
  'transport',
  'petrol',
  'food',
  'groceries',
  'utilities',
  'rent',
  'maintenance',
]);

// ── Compute Normalized Financial Intelligence ─────────────
export function analyzeFinancialBehavior(
  transactions: Transaction[],
  repaymentRecord?: Partial<RepaymentTrackRecord>
): FinancialIntelligence {
  const historyLengthDays = getHistoryDays(transactions);
  const incomeTxns = transactions.filter((t) => t.type === 'income' || t.type === 'transfer');
  const expenseTxns = transactions.filter((t) => t.type === 'expense');

  // ── A. Income Metrics ───────────────────────────────────
  const totalIncome = Math.round(incomeTxns.reduce((sum, t) => sum + t.amount, 0));
  const incomeDates = new Set(incomeTxns.map((t) => t.date));
  const activeEarningDays = incomeDates.size;
  const incomeDayRatio = historyLengthDays > 0 ? activeEarningDays / historyLengthDays : 0;
  
  const dailyIncomesByDate = new Map<string, number>();
  incomeTxns.forEach((t) => {
    dailyIncomesByDate.set(t.date, (dailyIncomesByDate.get(t.date) || 0) + t.amount);
  });
  const dailyIncomeValues = Array.from(dailyIncomesByDate.values());

  const averageIncomePerEarningDay = activeEarningDays > 0 ? Math.round(totalIncome / activeEarningDays) : 0;
  const medianDailyIncome = Math.round(median(dailyIncomeValues));
  const monthlyAverageIncome = historyLengthDays > 0 
    ? Math.round((totalIncome / historyLengthDays) * 30) 
    : 0;

  // Recent 30-day income
  const sortedDates = [...new Set(transactions.map((t) => t.date))].sort();
  const latestDateStr = sortedDates[sortedDates.length - 1] || new Date().toISOString().split('T')[0];
  const latestDate = new Date(latestDateStr);

  const cutoff30 = new Date(latestDate);
  cutoff30.setDate(cutoff30.getDate() - 30);
  const cutoff30Str = cutoff30.toISOString().split('T')[0];

  const recent30IncomeTxns = incomeTxns.filter((t) => t.date >= cutoff30Str);
  const recentMonthlyIncome = Math.round(recent30IncomeTxns.reduce((sum, t) => sum + t.amount, 0));

  // Income Trend (Split observation period in half)
  let incomeTrend: 'GROWING' | 'STABLE' | 'DECLINING' = 'STABLE';
  let incomeTrendRatio = 1.0;

  if (historyLengthDays >= 10 && incomeTxns.length >= 4) {
    const halfDays = Math.floor(historyLengthDays / 2);
    const midCutoff = new Date(sortedDates[0]);
    midCutoff.setDate(midCutoff.getDate() + halfDays);
    const midCutoffStr = midCutoff.toISOString().split('T')[0];

    const firstHalfTotal = incomeTxns
      .filter((t) => t.date <= midCutoffStr)
      .reduce((sum, t) => sum + t.amount, 0);
    const secondHalfTotal = incomeTxns
      .filter((t) => t.date > midCutoffStr)
      .reduce((sum, t) => sum + t.amount, 0);

    const firstHalfDaily = firstHalfTotal / Math.max(halfDays, 1);
    const secondHalfDaily = secondHalfTotal / Math.max(historyLengthDays - halfDays, 1);

    incomeTrendRatio = firstHalfDaily > 0 ? Math.round((secondHalfDaily / firstHalfDaily) * 100) / 100 : 1.0;

    if (incomeTrendRatio >= 1.15) incomeTrend = 'GROWING';
    else if (incomeTrendRatio <= 0.85) incomeTrend = 'DECLINING';
    else incomeTrend = 'STABLE';
  }

  const incomeMean = mean(dailyIncomeValues);
  const incomeStd = stdDev(dailyIncomeValues);
  const incomeVolatilityCv = incomeMean > 0 ? Math.round((incomeStd / incomeMean) * 100) / 100 : 0;

  const income: IncomeMetrics = {
    totalIncome,
    monthlyAverageIncome,
    recentMonthlyIncome,
    activeEarningDays,
    incomeDayRatio: Math.round(incomeDayRatio * 100) / 100,
    medianDailyIncome,
    averageIncomePerEarningDay,
    incomeTrend,
    incomeTrendRatio,
    incomeVolatilityCv,
  };

  // ── B. Expense Metrics ──────────────────────────────────
  const totalExpenses = Math.round(expenseTxns.reduce((sum, t) => sum + t.amount, 0));
  const monthlyAverageExpenses = historyLengthDays > 0 
    ? Math.round((totalExpenses / historyLengthDays) * 30) 
    : 0;

  const recent30ExpenseTxns = expenseTxns.filter((t) => t.date >= cutoff30Str);
  const recentMonthlyExpenses = Math.round(recent30ExpenseTxns.reduce((sum, t) => sum + t.amount, 0));
  const expenseToIncomeRatio = totalIncome > 0 
    ? Math.round((totalExpenses / totalIncome) * 100) / 100 
    : 1.0;

  const essentialTxns = expenseTxns.filter((t) => ESSENTIAL_CATEGORIES.has(t.category?.toLowerCase() || ''));
  const essentialSpendingTotal = Math.round(essentialTxns.reduce((sum, t) => sum + t.amount, 0));
  const essentialSpendingRatio = totalExpenses > 0 
    ? Math.round((essentialSpendingTotal / totalExpenses) * 100) / 100 
    : 0.7;
  const discretionarySpendingTotal = Math.max(0, totalExpenses - essentialSpendingTotal);

  const expenses: ExpenseMetrics = {
    totalExpenses,
    monthlyAverageExpenses,
    recentMonthlyExpenses,
    expenseToIncomeRatio,
    essentialSpendingTotal,
    essentialSpendingRatio,
    discretionarySpendingTotal,
  };

  // ── C. Cash-Flow & Balance Metrics ──────────────────────
  const netCashFlow = totalIncome - totalExpenses;
  const monthlyNetCashFlow = monthlyAverageIncome - monthlyAverageExpenses;

  const balances = transactions
    .filter((t) => t.balance !== undefined && t.balance !== null)
    .map((t) => t.balance);

  const averageBalance = balances.length > 0 ? Math.round(mean(balances)) : 0;
  const minimumBalance = balances.length > 0 ? Math.round(Math.min(...balances)) : 0;
  const maximumBalance = balances.length > 0 ? Math.round(Math.max(...balances)) : 0;
  const balanceStabilityCv = balances.length > 1 && averageBalance > 0 
    ? Math.round((stdDev(balances) / averageBalance) * 100) / 100 
    : 0;

  // Positive cash flow days ratio
  const allDates = Array.from(new Set(transactions.map((t) => t.date)));
  let positiveDaysCount = 0;
  allDates.forEach((d) => {
    const dayInc = incomeTxns.filter((t) => t.date === d).reduce((a, b) => a + b.amount, 0);
    const dayExp = expenseTxns.filter((t) => t.date === d).reduce((a, b) => a + b.amount, 0);
    if (dayInc >= dayExp) positiveDaysCount++;
  });
  const positiveCashFlowDaysRatio = allDates.length > 0 
    ? Math.round((positiveDaysCount / allDates.length) * 100) / 100 
    : 0;

  // Buffer in months & days of runway
  const monthlyBurn = Math.max(monthlyAverageExpenses, monthlyAverageIncome * 0.5, 1000);
  const cashBufferStrength = Math.round((averageBalance / monthlyBurn) * 100) / 100;
  const cashBufferDays = Math.round(cashBufferStrength * 30);

  const cashFlow: CashFlowMetrics = {
    netCashFlow,
    monthlyNetCashFlow,
    averageBalance,
    minimumBalance,
    maximumBalance,
    balanceStabilityCv,
    positiveCashFlowDaysRatio,
    cashBufferStrength,
    cashBufferDays,
  };

  // ── D. Activity Metrics ─────────────────────────────────
  const activeFinancialDays = allDates.length;
  const transactionFrequencyPerDay = historyLengthDays > 0 
    ? Math.round((transactions.length / historyLengthDays) * 10) / 10 
    : 0;

  const cutoff14 = new Date(latestDate);
  cutoff14.setDate(cutoff14.getDate() - 14);
  const cutoff14Str = cutoff14.toISOString().split('T')[0];

  const recent14Txns = transactions.filter((t) => t.date >= cutoff14Str);
  const recent14IncomeTxns = recent14Txns.filter((t) => t.type === 'income' || t.type === 'transfer');
  const recent14DayActiveDays = new Set(recent14Txns.map((t) => t.date)).size;
  const recent14DayIncome = Math.round(recent14IncomeTxns.reduce((a, b) => a + b.amount, 0));

  const historicalDailyIncome = historyLengthDays > 0 ? totalIncome / historyLengthDays : 0;
  const recent14DailyIncome = recent14DayIncome / 14;
  const recentToHistoricalVelocityRatio = historicalDailyIncome > 0 
    ? Math.round((recent14DailyIncome / historicalDailyIncome) * 100) / 100 
    : 1.0;

  const activity: ActivityMetrics = {
    totalTransactions: transactions.length,
    historyLengthDays,
    activeFinancialDays,
    transactionFrequencyPerDay,
    recent14DayActiveDays,
    recent14DayIncome,
    recentToHistoricalVelocityRatio,
  };

  // ── E. Anomalies & Integrity ────────────────────────────
  const flags: string[] = [];
  let repeatAmountRatio = 0;
  let dominantAmount = 0;
  let dominantAmountCount = 0;
  let isSyntheticTimingRegularity = false;
  let hasVolumeBurst = false;
  const hasNegativeBalanceDrop = minimumBalance < 0;

  if (incomeTxns.length >= 5) {
    const amounts = incomeTxns.map((t) => Math.round(t.amount));
    const countMap = new Map<number, number>();
    amounts.forEach((a) => countMap.set(a, (countMap.get(a) || 0) + 1));

    countMap.forEach((count, amt) => {
      if (count > dominantAmountCount) {
        dominantAmountCount = count;
        dominantAmount = amt;
      }
    });

    repeatAmountRatio = Math.round((dominantAmountCount / amounts.length) * 100) / 100;
    if (repeatAmountRatio >= 0.6 && dominantAmountCount >= 5) {
      flags.push(`Suspicious amount uniformity: ${Math.round(repeatAmountRatio * 100)}% of income transactions are identically ₹${dominantAmount}.`);
    }

    // Rigid timing dispersion check
    if (incomeDates.size >= 6) {
      const sortedIncomeDates = Array.from(incomeDates).sort();
      const gaps: number[] = [];
      for (let i = 1; i < sortedIncomeDates.length; i++) {
        const d1 = new Date(sortedIncomeDates[i - 1]);
        const d2 = new Date(sortedIncomeDates[i]);
        gaps.push(Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
      }
      const gapCv = mean(gaps) > 0 ? stdDev(gaps) / mean(gaps) : 1;
      if (gapCv < 0.03 && gaps.length >= 5) {
        isSyntheticTimingRegularity = true;
        flags.push('Suspiciously rigid automated interval between income deposits.');
      }
    }
  }

  if (transactions.length >= 12 && recent14Txns.length >= transactions.length * 0.75) {
    hasVolumeBurst = true;
    flags.push('Sudden 3x+ volume surge concentrated in recent 14-day window.');
  }

  if (hasNegativeBalanceDrop) {
    flags.push(`Account dipped into negative balance (₹${minimumBalance}) triggering overdraft friction.`);
  }

  let severity: AnomalyDetectionResult['severity'] = 'NONE';
  if (flags.length >= 2 || repeatAmountRatio >= 0.8) severity = 'HIGH';
  else if (flags.length === 1) severity = 'MEDIUM';
  else severity = 'NONE';

  const anomalies: AnomalyDetectionResult = {
    hasAnomalies: flags.length > 0,
    repeatAmountRatio,
    dominantAmount,
    dominantAmountCount,
    isSyntheticTimingRegularity,
    hasVolumeBurst,
    hasNegativeBalanceDrop,
    flags,
    severity,
  };

  // ── F. Repayment Track Record ───────────────────────────
  const repaymentRecordResolved: RepaymentTrackRecord = {
    totalLoansTaken: repaymentRecord?.totalLoansTaken ?? 0,
    completedLoansCount: repaymentRecord?.completedLoansCount ?? 0,
    totalPrincipalRepaid: repaymentRecord?.totalPrincipalRepaid ?? 0,
    onTimeRepaymentsCount: repaymentRecord?.onTimeRepaymentsCount ?? 0,
    lateRepaymentsCount: repaymentRecord?.lateRepaymentsCount ?? 0,
    repaymentReliabilityRatio: repaymentRecord?.onTimeRepaymentsCount !== undefined && repaymentRecord?.totalLoansTaken
      ? repaymentRecord.totalLoansTaken > 0
        ? Math.round((repaymentRecord.onTimeRepaymentsCount / (repaymentRecord.onTimeRepaymentsCount + (repaymentRecord.lateRepaymentsCount || 0))) * 100) / 100
        : 1.0
      : 1.0,
  };

  // ── G. Data Confidence & Cold Start Assessment ──────────
  let confidencePercentage = 0;
  if (historyLengthDays === 0) {
    confidencePercentage = 0;
  } else if (historyLengthDays < 21) {
    confidencePercentage = Math.round((historyLengthDays / 21) * 60); // 0–60% during building phase
  } else {
    confidencePercentage = Math.min(100, Math.round(60 + ((historyLengthDays - 21) / 69) * 40));
  }

  const confidenceLevel: DataConfidenceAssessment['confidenceLevel'] =
    confidencePercentage >= 75 ? 'HIGH' : confidencePercentage >= 45 ? 'MODERATE' : 'LOW';

  const isColdStart = historyLengthDays < 21;
  const dataSufficiencyDescription = isColdStart
    ? `Profile-building stage: ${historyLengthDays} of 21 required observation days completed (${confidencePercentage}% confidence).`
    : `Established profile: ${historyLengthDays} days of continuous behavioral cash-flow data available (${confidencePercentage}% confidence).`;

  const confidence: DataConfidenceAssessment = {
    confidencePercentage,
    confidenceLevel,
    isColdStart,
    dataSufficiencyDescription,
  };

  return {
    income,
    expenses,
    cashFlow,
    activity,
    anomalies,
    repaymentRecord: repaymentRecordResolved,
    confidence,
  };
}

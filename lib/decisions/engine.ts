// ============================================================
// BAHI — Explainable Credit Decision Engine
// Multi-dimensional decisioning based on Score, Stability, History,
// Anomalies, and Cash Buffer.
// ============================================================

import type { Transaction, DecisionType } from '@/types';
import type {
  EnhancedBahiScore,
  EnhancedCreditDecision,
  ActionableRecommendation,
  FinancialIntelligence,
} from '@/lib/intelligence/types';
import { calculateBahiScore } from '@/lib/scoring/engine';
import { analyzeFinancialBehavior } from '@/lib/intelligence/financial-intelligence.service';

const BASE_LIMIT_PER_SCORE_POINT = 25; // ₹25 per score point above 400

// ── Generate Factor-Driven Actionable Recommendations ────
export function generateRecommendations(
  score: EnhancedBahiScore,
  intelligence: FinancialIntelligence
): ActionableRecommendation[] {
  const recommendations: ActionableRecommendation[] = [];
  const factors = score.factors;
  const sortedWeakestFirst = [...factors].sort((a, b) => a.score - b.score);

  for (const factor of sortedWeakestFirst) {
    if (factor.key === 'cashBuffer') {
      const targetBuffer = Math.max(3000, Math.round(intelligence.income.monthlyAverageIncome * 0.3));
      recommendations.push({
        factorKey: 'cashBuffer',
        factorName: 'Cash Buffer',
        priority: factor.score < 50 ? 'HIGH' : 'MEDIUM',
        headline: 'Strengthen End-of-Week Reserve',
        actionableStep: `Maintain an average account balance above ₹${targetBuffer.toLocaleString('en-IN')} to provide at least 15 days of operating buffer.`,
        targetMetric: `Target: ₹${targetBuffer.toLocaleString('en-IN')} average balance`,
      });
    } else if (factor.key === 'consistency') {
      recommendations.push({
        factorKey: 'consistency',
        factorName: 'Income Consistency',
        priority: factor.score < 50 ? 'HIGH' : 'MEDIUM',
        headline: 'Maintain 5+ Active Earning Days/Week',
        actionableStep: 'Log earnings on at least 5 days each week to demonstrate reliable, steady operational cash flow.',
        targetMetric: 'Target: 5+ active earning days per week',
      });
    } else if (factor.key === 'recentActivity') {
      recommendations.push({
        factorKey: 'recentActivity',
        factorName: 'Recent Activity',
        priority: factor.score < 50 ? 'HIGH' : 'MEDIUM',
        headline: 'Sustain Trailing 14-Day Activity',
        actionableStep: 'Avoid long multi-day dormant gaps to maintain active earning velocity.',
        targetMetric: 'Target: 8+ active days in trailing 14-day window',
      });
    } else if (factor.key === 'incomeTrend') {
      recommendations.push({
        factorKey: 'incomeTrend',
        factorName: 'Cash-Flow Stability',
        priority: factor.score < 50 ? 'HIGH' : 'MEDIUM',
        headline: 'Protect Positive Operating Margin',
        actionableStep: `Keep operating expenses below 80% of earnings (current ratio: ${Math.round(intelligence.expenses.expenseToIncomeRatio * 100)}%).`,
        targetMetric: 'Target: Expense-to-income ratio < 80%',
      });
    } else if (factor.key === 'integrity') {
      if (intelligence.anomalies.hasAnomalies) {
        recommendations.push({
          factorKey: 'integrity',
          factorName: 'Financial Integrity',
          priority: 'HIGH',
          headline: 'Ensure Natural Organic Transaction Logging',
          actionableStep: intelligence.anomalies.flags[0] || 'Avoid repetitive identical lump sums.',
          targetMetric: 'Target: Natural gig earning variations',
        });
      }
    }
  }

  // If in cold-start, add graduation milestone
  if (intelligence.confidence.isColdStart) {
    const daysRemaining = Math.max(1, 21 - intelligence.activity.historyLengthDays);
    recommendations.unshift({
      factorKey: 'history',
      factorName: 'Profile Maturity',
      priority: 'HIGH',
      headline: `Complete 21 Days of History (${daysRemaining} days remaining)`,
      actionableStep: `Continue normal account activity for ${daysRemaining} more days to unlock full prime credit lines.`,
      targetMetric: 'Milestone: 21 continuous observation days',
    });
  }

  return recommendations.slice(0, 3);
}

// ── Multi-Dimensional Credit Decisioning ──────────────────
export function calculateCreditDecision(
  scoreInput: EnhancedBahiScore | { total: number; factors: any[]; historyDays?: number; confidence?: number },
  txns: Transaction[]
): EnhancedCreditDecision {
  const intelligence = (scoreInput as EnhancedBahiScore).intelligence || analyzeFinancialBehavior(txns);
  const score = (scoreInput as EnhancedBahiScore).intelligence ? (scoreInput as EnhancedBahiScore) : calculateBahiScore(txns);

  const historyDays = intelligence.activity.historyLengthDays;
  const totalIncome = intelligence.income.totalIncome;
  const monthlyIncome = intelligence.income.monthlyAverageIncome;
  const hasSevereAnomalies = intelligence.anomalies.severity === 'HIGH' || intelligence.anomalies.severity === 'CRITICAL';
  const hasModerateAnomalies = intelligence.anomalies.severity === 'MEDIUM';
  const isNegativeCashFlow = intelligence.cashFlow.netCashFlow < 0;
  const cashBufferFactor = score.factors.find((f) => f.key === 'cashBuffer')?.score ?? 50;
  const consistencyFactor = score.factors.find((f) => f.key === 'consistency')?.score ?? 50;

  let type: DecisionType;
  let recommendedLimit: number;
  let maxLimit: number;
  let repaymentDays: number;
  let repaymentConfidence: number;
  const reasons: string[] = [];
  const improvements: string[] = [];

  // Decision Logic
  if (totalIncome === 0 || historyDays === 0) {
    type = 'decline';
    recommendedLimit = 0;
    maxLimit = 0;
    repaymentDays = 0;
    repaymentConfidence = 0;
    reasons.push('No verified income transactions detected in statement history.');
    improvements.push('Deposit or receive business earnings to establish initial credit behavior.');
  } else if (hasSevereAnomalies) {
    type = 'decline';
    recommendedLimit = 0;
    maxLimit = 0;
    repaymentDays = 0;
    repaymentConfidence = 0;
    reasons.push('Integrity alert: Suspicious synthetic transaction patterns detected.');
    if (intelligence.anomalies.flags[0]) reasons.push(intelligence.anomalies.flags[0]);
    improvements.push('Resolve transaction anomalies with verified platform earnings.');
    improvements.push('Submit platform aggregator direct credentials for manual audit.');
  } else if (historyDays < 21) {
    // Cold Start / Profile Building Phase
    type = 'starter_advance';
    // Responsible starter limit: 10% of monthly estimate or min ₹500, max ₹2,000
    const calculatedStarter = Math.round(monthlyIncome * 0.1);
    recommendedLimit = Math.min(2000, Math.max(500, calculatedStarter));
    maxLimit = Math.min(3500, Math.max(1000, Math.round(monthlyIncome * 0.15)));
    repaymentDays = 7; // Weekly starter cycle
    repaymentConfidence = Math.min(75, Math.max(45, Math.round(consistencyFactor * 0.8)));

    reasons.push(`Account is in the Profile Building stage (${historyDays} of 21 required days observed).`);
    reasons.push(`Eligible for responsible starter micro-advance based on ₹${totalIncome.toLocaleString('en-IN')} verified income.`);
    improvements.push(`Complete ${21 - historyDays} more days of active earnings to graduate to prime credit tiers.`);
    improvements.push('On-time repayment of starter advances accelerates score maturity.');
  } else if (score.total >= 680 && !isNegativeCashFlow && cashBufferFactor >= 40 && !hasModerateAnomalies) {
    // Approved Prime / Good Profile
    type = 'approve';
    const limitByScore = Math.round((score.total - 400) * BASE_LIMIT_PER_SCORE_POINT);
    const limitByIncome = Math.round(monthlyIncome * 0.45);
    recommendedLimit = Math.min(limitByScore, limitByIncome, 35000);
    recommendedLimit = Math.max(5000, Math.round(recommendedLimit / 500) * 500); // Clean round to 500
    maxLimit = Math.min(50000, Math.round(recommendedLimit * 1.5));
    repaymentDays = score.total >= 750 ? 30 : 21;
    repaymentConfidence = Math.min(96, Math.max(75, Math.round((score.total / 900) * 100)));

    reasons.push(`Bahi Score of ${score.total} demonstrates stable, low-risk financial behavior.`);
    reasons.push(`${historyDays} days of verified history with positive cash flow of ₹${intelligence.cashFlow.netCashFlow.toLocaleString('en-IN')}.`);
    if (cashBufferFactor >= 65) reasons.push(`Healthy liquidity reserve (₹${intelligence.cashFlow.averageBalance.toLocaleString('en-IN')} avg balance).`);
    improvements.push('Maintaining on-time repayments will expand your working capital ceiling to maximum tiers.');
  } else if (score.total >= 520 || historyDays < 35 || isNegativeCashFlow) {
    // Under Review / Moderate Profile
    type = 'review';
    const limitByScore = Math.round((score.total - 400) * BASE_LIMIT_PER_SCORE_POINT * 0.5);
    const limitByIncome = Math.round(monthlyIncome * 0.25);
    recommendedLimit = Math.min(limitByScore, limitByIncome, 8000);
    recommendedLimit = Math.max(2000, Math.round(recommendedLimit / 500) * 500);
    maxLimit = Math.min(12000, Math.round(recommendedLimit * 1.3));
    repaymentDays = 14;
    repaymentConfidence = Math.min(70, Math.max(50, Math.round((score.total / 900) * 85)));

    reasons.push(`Score of ${score.total} placed under underwriter review due to ${isNegativeCashFlow ? 'negative cash-flow margin' : 'moderate history duration'}.`);
    if (cashBufferFactor < 40) reasons.push('Constrained cash buffer elevates short-term liquidity risk.');
    if (hasModerateAnomalies) reasons.push('Minor transaction clustering detected; manual verification advised.');
    improvements.push('Maintain consistent daily earnings for the next 30 days.');
    improvements.push('Increase end-of-day balance to build at least 15 days of operating cushion.');
  } else {
    // Declined
    type = 'decline';
    recommendedLimit = 0;
    maxLimit = 0;
    repaymentDays = 0;
    repaymentConfidence = 0;
    reasons.push(`Bahi Score of ${score.total} is below institutional minimum threshold.`);
    reasons.push('Elevated income volatility and insufficient cash buffer.');
    improvements.push('Build regular weekly earning continuity.');
    improvements.push('Reduce operating deficits and maintain positive account balance.');
  }

  const recommendations = generateRecommendations(score, intelligence);

  return {
    type,
    recommendedLimit: Math.max(0, recommendedLimit),
    maxLimit: Math.max(0, maxLimit),
    repaymentDays,
    repaymentConfidence,
    reasons,
    improvements,
    confidenceLevel: intelligence.confidence.confidenceLevel,
    historyDays,
    riskBand: score.riskCategory === 'low' ? 'LOW' : score.riskCategory === 'building' ? 'BUILDING' : score.riskCategory === 'medium' ? 'MEDIUM' : 'HIGH',
    recommendations,
  };
}

// ── Deterministic Repayment Pricing ──────────────────────
export function calculateRepaymentAmount(
  principal: number,
  days: number,
  score: number
): number {
  // Fair, institutional pricing: 2.0% to 4.5% flat fee based on behavioral risk
  let flatFeePercent: number;
  if (score >= 750) flatFeePercent = 0.02; // 2.0% Prime
  else if (score >= 680) flatFeePercent = 0.03; // 3.0% Good
  else if (score >= 600) flatFeePercent = 0.04; // 4.0% Moderate
  else flatFeePercent = 0.045; // 4.5% Starter / Building

  const total = Math.round(principal * (1 + flatFeePercent));
  return Math.max(principal, total);
}

// ── Score Evolution Calculator ───────────────────────────
// Calculates the updated score after a verified on-time repayment
export function calculateScoreAfterRepayment(
  currentScore: number,
  previousLoansCount = 0
): number {
  // Proven on-time repayment directly elevates credit integrity by 15-25 points
  const baseReward = 18;
  const diminishedReturnMultiplier = Math.max(0.5, 1 - previousLoansCount * 0.1);
  const boost = Math.round(baseReward * diminishedReturnMultiplier);
  return Math.min(900, currentScore + boost);
}

// ── Credit Ceiling Expansion Calculator ──────────────────
export function calculateNewLimit(
  currentLimit: number,
  newScore: number,
  monthlyIncome: number
): number {
  const limitByScore = Math.round((newScore - 400) * BASE_LIMIT_PER_SCORE_POINT);
  const limitByIncome = Math.round(monthlyIncome * 0.55);
  const expanded = Math.max(currentLimit + 1000, Math.min(limitByScore, limitByIncome, 50000));
  return Math.round(expanded / 500) * 500;
}

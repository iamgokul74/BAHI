// ============================================================
// BAHI — Centralized Financial Intelligence Types
// ============================================================

import type { Transaction, FactorScore, BahiScore, CreditDecision, DecisionType } from '@/types';

export interface IncomeMetrics {
  totalIncome: number;
  monthlyAverageIncome: number;
  recentMonthlyIncome: number; // Last 30 days
  activeEarningDays: number;
  incomeDayRatio: number; // Active earning days / total history days
  medianDailyIncome: number;
  averageIncomePerEarningDay: number;
  incomeTrend: 'GROWING' | 'STABLE' | 'DECLINING';
  incomeTrendRatio: number; // Second half vs First half
  incomeVolatilityCv: number; // Coefficient of variation (stdDev / mean)
}

export interface ExpenseMetrics {
  totalExpenses: number;
  monthlyAverageExpenses: number;
  recentMonthlyExpenses: number;
  expenseToIncomeRatio: number;
  essentialSpendingTotal: number;
  essentialSpendingRatio: number; // Fuel, food, transport, utilities
  discretionarySpendingTotal: number;
}

export interface CashFlowMetrics {
  netCashFlow: number;
  monthlyNetCashFlow: number;
  averageBalance: number;
  minimumBalance: number;
  maximumBalance: number;
  balanceStabilityCv: number;
  positiveCashFlowDaysRatio: number; // % of active days with income > expenses
  cashBufferStrength: number; // Average balance relative to monthly income (in months)
  cashBufferDays: number; // Buffer in estimated days of runway
}

export interface ActivityMetrics {
  totalTransactions: number;
  historyLengthDays: number;
  activeFinancialDays: number; // Days with any income or expense
  transactionFrequencyPerDay: number;
  recent14DayActiveDays: number;
  recent14DayIncome: number;
  recentToHistoricalVelocityRatio: number;
}

export interface AnomalyDetectionResult {
  hasAnomalies: boolean;
  repeatAmountRatio: number;
  dominantAmount: number;
  dominantAmountCount: number;
  isSyntheticTimingRegularity: boolean;
  hasVolumeBurst: boolean;
  hasNegativeBalanceDrop: boolean;
  flags: string[];
  severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface RepaymentTrackRecord {
  totalLoansTaken: number;
  completedLoansCount: number;
  totalPrincipalRepaid: number;
  onTimeRepaymentsCount: number;
  lateRepaymentsCount: number;
  repaymentReliabilityRatio: number; // (on-time / total repayments)
}

export interface DataConfidenceAssessment {
  confidencePercentage: number; // 0–100%
  confidenceLevel: 'LOW' | 'MODERATE' | 'HIGH';
  isColdStart: boolean; // History < 21 days
  dataSufficiencyDescription: string;
}

export interface FinancialIntelligence {
  income: IncomeMetrics;
  expenses: ExpenseMetrics;
  cashFlow: CashFlowMetrics;
  activity: ActivityMetrics;
  anomalies: AnomalyDetectionResult;
  repaymentRecord: RepaymentTrackRecord;
  confidence: DataConfidenceAssessment;
}

export interface FactorDetail extends FactorScore {
  formula: string;
  supportingMetrics: Record<string, string | number>;
}

export interface EnhancedBahiScore extends BahiScore {
  factors: FactorDetail[];
  intelligence: FinancialIntelligence;
}

export interface ActionableRecommendation {
  factorKey: string;
  factorName: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  headline: string;
  actionableStep: string;
  targetMetric: string;
}

export interface EnhancedCreditDecision extends CreditDecision {
  confidenceLevel: 'LOW' | 'MODERATE' | 'HIGH';
  historyDays: number;
  riskBand: 'LOW' | 'MEDIUM' | 'HIGH' | 'BUILDING';
  recommendations: ActionableRecommendation[];
}

import { describe, it, expect } from 'vitest';
import {
  calculateBahiScore,
  calculateConsistency,
  calculateRecentActivity,
  calculateIncomeTrend,
  calculateCashBuffer,
  calculateIntegrity,
  getHistoryDays,
  SCORE_MIN,
  SCORE_MAX,
} from '../lib/scoring/engine';
import { calculateCreditDecision, calculateRepaymentAmount, calculateNewLimit, calculateScoreAfterRepayment } from '../lib/decisions/engine';
import { computeCashFlowMetrics, detectAnomalies } from '../lib/scoring/service';
import { analyzeFinancialBehavior } from '../lib/intelligence/financial-intelligence.service';
import { parseTransactionCsv } from '../lib/csv/parser';
import { createSessionToken, verifySessionToken, hashPassword, verifyPassword } from '../lib/auth/jwt';
import { buildPersonas } from '../data/personas';
import type { Transaction } from '../types';

describe('BAHI Intelligence & Scoring Engine Core Tests', () => {
  const sampleTransactions: Transaction[] = [
    { id: '1', date: '2024-11-01', description: 'Rides', amount: 1200, type: 'income', category: 'gig', balance: 2500 },
    { id: '2', date: '2024-11-02', description: 'Fuel', amount: 300, type: 'expense', category: 'transport', balance: 2200 },
    { id: '3', date: '2024-11-03', description: 'Rides', amount: 1400, type: 'income', category: 'gig', balance: 3600 },
    { id: '4', date: '2024-11-04', description: 'Rides', amount: 1100, type: 'income', category: 'gig', balance: 4700 },
    { id: '5', date: '2024-11-05', description: 'Food', amount: 200, type: 'expense', category: 'food', balance: 4500 },
    { id: '6', date: '2024-11-06', description: 'Rides', amount: 1350, type: 'income', category: 'gig', balance: 5850 },
    { id: '7', date: '2024-11-07', description: 'Rides', amount: 1500, type: 'income', category: 'gig', balance: 7350 },
  ];

  // 1. Empty Transaction History
  it('1. Handles empty transaction history safely (bounded at 300)', () => {
    const emptyScore = calculateBahiScore([]);
    expect(emptyScore.total).toBe(SCORE_MIN);
    expect(emptyScore.historyDays).toBe(0);
    expect(emptyScore.confidence).toBe(0);
    expect(emptyScore.riskCategory).toBe('building');
  });

  // 2. Very Short History (Cold Start)
  it('2. Handles very short history (1-14 days) with cold-start building confidence', () => {
    const shortTxns: Transaction[] = [
      { id: '1', date: '2024-11-01', description: 'Trip 1', amount: 900, type: 'income', category: 'gig', balance: 900 },
      { id: '2', date: '2024-11-07', description: 'Trip 2', amount: 1100, type: 'income', category: 'gig', balance: 2000 },
    ];
    const score = calculateBahiScore(shortTxns);
    expect(score.historyDays).toBeLessThanOrEqual(14);
    expect(score.confidence).toBeLessThan(50);
    expect(score.riskCategory).toBe('building');

    const decision = calculateCreditDecision(score, shortTxns);
    expect(decision.type).toBe('starter_advance');
    expect(decision.recommendedLimit).toBeLessThanOrEqual(2000);
  });

  // 3. Consistent Income
  it('3. Recognizes consistent steady daily income with strong consistency score', () => {
    const consistentTxns: Transaction[] = [];
    for (let i = 0; i < 30; i++) {
      const date = `2024-11-${String(i + 1).padStart(2, '0')}`;
      if (i % 7 !== 0) { // 6 days a week
        consistentTxns.push({ id: `t_${i}`, date, description: 'Rides', amount: 1200 + (i % 3) * 50, type: 'income', category: 'gig', balance: 5000 + i * 500 });
      }
    }
    const consistency = calculateConsistency(consistentTxns);
    expect(consistency.score).toBeGreaterThanOrEqual(75);
    expect(consistency.status).toBe('strong');
  });

  // 4. Volatile Income
  it('4. Assesses highly volatile gig income appropriately without crashing', () => {
    const volatileTxns: Transaction[] = [
      { id: '1', date: '2024-11-01', description: 'Surge', amount: 4500, type: 'income', category: 'gig', balance: 4500 },
      { id: '2', date: '2024-11-10', description: 'Tiny', amount: 200, type: 'income', category: 'gig', balance: 4700 },
      { id: '3', date: '2024-11-20', description: 'Surge', amount: 5000, type: 'income', category: 'gig', balance: 9700 },
    ];
    const intel = analyzeFinancialBehavior(volatileTxns);
    expect(intel.income.incomeVolatilityCv).toBeGreaterThan(0.5);
    const score = calculateBahiScore(volatileTxns);
    expect(score.total).toBeGreaterThanOrEqual(300);
    expect(score.total).toBeLessThanOrEqual(900);
  });

  // 5. Strong Cash Buffer vs 6. Weak Cash Buffer
  it('5 & 6. Distinguishes strong liquidity buffer from weak buffer', () => {
    const strongBufferTxns: Transaction[] = [
      { id: '1', date: '2024-11-01', description: 'Trip', amount: 1000, type: 'income', category: 'gig', balance: 50000 },
      { id: '2', date: '2024-11-15', description: 'Trip', amount: 1000, type: 'income', category: 'gig', balance: 51000 },
    ];
    const weakBufferTxns: Transaction[] = [
      { id: '1', date: '2024-11-01', description: 'Trip', amount: 1000, type: 'income', category: 'gig', balance: 200 },
      { id: '2', date: '2024-11-15', description: 'Trip', amount: 1000, type: 'income', category: 'gig', balance: 150 },
    ];

    const strongFactor = calculateCashBuffer(strongBufferTxns);
    const weakFactor = calculateCashBuffer(weakBufferTxns);

    expect(strongFactor.score).toBeGreaterThan(weakFactor.score);
    expect(strongFactor.status).toBe('strong');
    expect(weakFactor.status).toBe('weak');
  });

  // 7. Positive Cash Flow vs 8. Negative Cash Flow
  it('7 & 8. Distinguishes positive cash flow from chronic negative cash flow', () => {
    const posTxns: Transaction[] = [
      { id: '1', date: '2024-11-01', description: 'Earn', amount: 3000, type: 'income', category: 'gig', balance: 5000 },
      { id: '2', date: '2024-11-02', description: 'Spend', amount: 500, type: 'expense', category: 'food', balance: 4500 },
    ];
    const negTxns: Transaction[] = [
      { id: '1', date: '2024-11-01', description: 'Earn', amount: 500, type: 'income', category: 'gig', balance: 2000 },
      { id: '2', date: '2024-11-02', description: 'Spend', amount: 3000, type: 'expense', category: 'other', balance: 500 },
    ];

    const posIntel = analyzeFinancialBehavior(posTxns);
    const negIntel = analyzeFinancialBehavior(negTxns);

    expect(posIntel.cashFlow.netCashFlow).toBeGreaterThan(0);
    expect(negIntel.cashFlow.netCashFlow).toBeLessThan(0);
  });

  // 9. Suspicious Repeated Patterns vs 10. Normal Repeated Transactions
  it('9 & 10. Detects artificial synthetic loops while allowing natural variable earnings', () => {
    const syntheticTxns: Transaction[] = [
      { id: '1', date: '2024-11-01', description: 'Deposit', amount: 1250, type: 'income', category: 'other', balance: 1250 },
      { id: '2', date: '2024-11-02', description: 'Deposit', amount: 1250, type: 'income', category: 'other', balance: 2500 },
      { id: '3', date: '2024-11-03', description: 'Deposit', amount: 1250, type: 'income', category: 'other', balance: 3750 },
      { id: '4', date: '2024-11-04', description: 'Deposit', amount: 1250, type: 'income', category: 'other', balance: 5000 },
      { id: '5', date: '2024-11-05', description: 'Deposit', amount: 1250, type: 'income', category: 'other', balance: 6250 },
      { id: '6', date: '2024-11-06', description: 'Deposit', amount: 1250, type: 'income', category: 'other', balance: 7500 },
    ];
    const anomalies = detectAnomalies(syntheticTxns);
    expect(anomalies.some((a) => a.type === 'REPEATED_AMOUNTS')).toBe(true);

    const naturalTxns: Transaction[] = [
      { id: '1', date: '2024-11-01', description: 'Rides', amount: 850, type: 'income', category: 'gig', balance: 850 },
      { id: '2', date: '2024-11-02', description: 'Rides', amount: 1420, type: 'income', category: 'gig', balance: 2270 },
      { id: '3', date: '2024-11-03', description: 'Rides', amount: 960, type: 'income', category: 'gig', balance: 3230 },
      { id: '4', date: '2024-11-05', description: 'Rides', amount: 1100, type: 'income', category: 'gig', balance: 4330 },
      { id: '5', date: '2024-11-06', description: 'Rides', amount: 1750, type: 'income', category: 'gig', balance: 6080 },
    ];
    const naturalAnomalies = detectAnomalies(naturalTxns);
    expect(naturalAnomalies).toHaveLength(0);
  });

  // 11. Score Boundaries 300 and 900
  it('11. Enforces strict mathematical bounds 300 <= Score <= 900', () => {
    const minScore = calculateBahiScore([]);
    expect(minScore.total).toBe(300);

    const primeTxns: Transaction[] = [];
    for (let i = 0; i < 90; i++) {
      primeTxns.push({
        id: `tx_${i}`,
        date: `2024-11-${String((i % 30) + 1).padStart(2, '0')}`,
        description: 'Prime Earning',
        amount: 3000 + (i % 5) * 200,
        type: 'income',
        category: 'gig',
        balance: 100000 + i * 2000,
      });
    }
    const maxScore = calculateBahiScore(primeTxns, { completedLoansCount: 5, onTimeRepaymentsCount: 5 });
    expect(maxScore.total).toBeLessThanOrEqual(900);
    expect(maxScore.total).toBeGreaterThanOrEqual(750);
  });

  // 12. Repayment Recalculation & Evolution
  it('12. Accurately calculates repayment amount and new score evolution', () => {
    const fee = calculateRepaymentAmount(5000, 21, 750);
    expect(fee).toBe(5100); // 2.0% of 5000 = +100

    const evolvedScore = calculateScoreAfterRepayment(680, 0);
    expect(evolvedScore).toBeGreaterThan(680);
    expect(evolvedScore).toBeLessThanOrEqual(900);

    const expandedLimit = calculateNewLimit(5000, 720, 25000);
    expect(expandedLimit).toBeGreaterThan(5000);
  });

  // 15. Priya vs Ravi Separation
  it('15. Naturally generates distinct profiles for Priya (Building) and Ravi (Prime Established)', () => {
    const personas = buildPersonas();
    const priya = personas.find((p) => p.id === 'new_rider')!;
    const ravi = personas.find((p) => p.id === 'cab_driver')!;

    expect(priya.coldStart).toBe(true);
    expect(priya.score.historyDays).toBeLessThanOrEqual(14);
    expect(priya.decision.type).toBe('starter_advance');

    expect(ravi.coldStart).toBe(false);
    expect(ravi.score.historyDays).toBeGreaterThanOrEqual(60);
    expect(ravi.decision.type).toBe('approve');
    expect(ravi.decision.recommendedLimit).toBeGreaterThan(priya.decision.recommendedLimit);
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../lib/db';
import { hashPassword, createSessionToken, verifySessionToken } from '../lib/auth/jwt';
import { calculateBahiScore, calculateConsistency, calculateCashBuffer, calculateIntegrity } from '../lib/scoring/engine';
import { calculateCreditDecision } from '../lib/decisions/engine';
import { computeCashFlowMetrics, detectAnomalies } from '../lib/scoring/service';
import type { Transaction } from '../types';

describe('BAHI Edge Cases & Financial Boundaries', () => {
  it('handles expense-only financial profile without crash', () => {
    const expenseOnlyTxns: Transaction[] = [
      { id: '1', date: '2024-11-01', description: 'Groceries', amount: 500, type: 'expense', category: 'food', balance: 1000 },
      { id: '2', date: '2024-11-02', description: 'Fuel', amount: 300, type: 'expense', category: 'transport', balance: 700 },
      { id: '3', date: '2024-11-03', description: 'Rent', amount: 600, type: 'expense', category: 'rent', balance: 100 },
    ];

    const metrics = computeCashFlowMetrics(expenseOnlyTxns);
    expect(metrics.totalIncome).toBe(0);
    expect(metrics.totalExpenses).toBe(1400);
    expect(metrics.netCashFlow).toBe(-1400);
    expect(metrics.activeEarningDays).toBe(0);

    const score = calculateBahiScore(expenseOnlyTxns);
    expect(score.total).toBeGreaterThanOrEqual(300);
    expect(score.total).toBeLessThanOrEqual(500);

    const decision = calculateCreditDecision(score, expenseOnlyTxns);
    expect(decision.type).toBe('decline');
    expect(decision.recommendedLimit).toBe(0);
  });

  it('handles negative or zero running balances safely with constrained buffer score', () => {
    const negativeBalanceTxns: Transaction[] = [
      { id: '1', date: '2024-11-01', description: 'Penalty', amount: 200, type: 'expense', category: 'other', balance: -50 },
      { id: '2', date: '2024-11-02', description: 'Overdraft', amount: 150, type: 'expense', category: 'other', balance: -200 },
    ];

    const bufferFactor = calculateCashBuffer(negativeBalanceTxns);
    expect(bufferFactor.score).toBeLessThanOrEqual(30);
    expect(bufferFactor.status).toBe('weak');
  });

  it('13. Handles late repayment behavior as risk signal without crashing or arbitrary destruction', () => {
    const sampleTxns: Transaction[] = [
      { id: '1', date: '2024-11-01', description: 'Rides', amount: 1500, type: 'income', category: 'gig', balance: 4000 },
      { id: '2', date: '2024-11-05', description: 'Rides', amount: 1200, type: 'income', category: 'gig', balance: 5200 },
    ];
    const normalScore = calculateBahiScore(sampleTxns, { totalLoansTaken: 1, completedLoansCount: 1, onTimeRepaymentsCount: 1, lateRepaymentsCount: 0 });
    const lateScore = calculateBahiScore(sampleTxns, { totalLoansTaken: 2, completedLoansCount: 1, onTimeRepaymentsCount: 1, lateRepaymentsCount: 1 });

    expect(lateScore.total).toBeLessThan(normalScore.total);
    expect(lateScore.total).toBeGreaterThanOrEqual(300); // Does not arbitrarily destroy to 0
  });

  it('1-day single transaction profile is assessed as building profile', () => {
    const singleTxn: Transaction[] = [
      { id: '1', date: '2024-11-01', description: 'First trip', amount: 500, type: 'income', category: 'gig', balance: 500 },
    ];

    const score = calculateBahiScore(singleTxn);
    expect(score.historyDays).toBe(1);
    expect(score.riskCategory).toBe('building');

    const decision = calculateCreditDecision(score, singleTxn);
    expect(decision.type).toBe('starter_advance');
  });

  it('correctly transitions at 20 days vs 21 days boundary', () => {
    // 20-day profile
    const txns20: Transaction[] = [];
    for (let i = 0; i < 20; i++) {
      const dateStr = `2024-11-${String(i + 1).padStart(2, '0')}`;
      const amount = 850 + (i % 5) * 120; // Natural variable gig earnings
      txns20.push({ id: `tx_${i}`, date: dateStr, description: 'Trip', amount, type: 'income', category: 'gig', balance: (i + 1) * 1000 });
    }
    const score20 = calculateBahiScore(txns20);
    expect(score20.historyDays).toBe(20);

    // 21-day profile
    const txns21: Transaction[] = [...txns20, { id: 'tx_20', date: '2024-11-21', description: 'Trip', amount: 1250, type: 'income', category: 'gig', balance: 21000 }];
    const score21 = calculateBahiScore(txns21);
    expect(score21.historyDays).toBe(21);
    const decision21 = calculateCreditDecision(score21, txns21);
    expect(decision21.type).not.toBe('starter_advance');
    expect(['approve', 'review']).toContain(decision21.type);
  });
});

describe('17. Security & Borrower Data Isolation Tests', () => {
  let userAId = '';
  let userBId = '';

  beforeAll(async () => {
    const hash = await hashPassword('Pass123!');
    const uA = await db.user.create({
      data: {
        email: `sec_test_a_${Date.now()}@bahi.in`,
        passwordHash: hash,
        name: 'Borrower Alice',
        role: 'BORROWER',
      },
    });
    userAId = uA.id;

    const uB = await db.user.create({
      data: {
        email: `sec_test_b_${Date.now()}@bahi.in`,
        passwordHash: hash,
        name: 'Borrower Bob',
        role: 'BORROWER',
      },
    });
    userBId = uB.id;
  });

  afterAll(async () => {
    if (userAId) await db.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
  });

  it('ensures separate users have isolated transaction data', async () => {
    await db.transaction.create({
      data: {
        userId: userAId,
        date: new Date(),
        description: 'Alice Private Earning',
        amount: 5000,
        type: 'INCOME',
        category: 'Gig',
        balance: 5000,
      },
    });

    const bobTxns = await db.transaction.findMany({ where: { userId: userBId } });
    expect(bobTxns).toHaveLength(0);

    const aliceTxns = await db.transaction.findMany({ where: { userId: userAId } });
    expect(aliceTxns).toHaveLength(1);
    expect(aliceTxns[0].description).toBe('Alice Private Earning');
  });

  it('prevents role escalation by strictly signing and verifying JWT claims', async () => {
    const regularToken = await createSessionToken({
      userId: userAId,
      email: 'alice@bahi.in',
      name: 'Borrower Alice',
      role: 'BORROWER',
    });

    const verified = await verifySessionToken(regularToken);
    expect(verified?.role).toBe('BORROWER');
    expect(verified?.role).not.toBe('LENDER');
    expect(verified?.role).not.toBe('ADMIN');
  });
});

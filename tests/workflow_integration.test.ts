import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../lib/db';
import { hashPassword } from '../lib/auth/jwt';
import { recalculateAndPersistScore } from '../lib/scoring/service';

describe('BAHI End-to-End Workflow Integration', () => {
  let testUserId = '';
  let testLoanId = '';
  let testAppId = '';

  beforeAll(async () => {
    // Setup clean test user
    const passwordHash = await hashPassword('TestPassword123!');
    const user = await db.user.create({
      data: {
        email: `test_integration_${Date.now()}@bahi.in`,
        passwordHash,
        name: 'Auto Integration Tester',
        role: 'BORROWER',
        profile: {
          create: {
            occupation: 'Delivery Executive',
            city: 'Bengaluru',
            coldStartStatus: 'COLD_START',
            starterEligibility: 0,
            profileAgeDays: 0,
          },
        },
      },
      include: { profile: true },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await db.repayment.deleteMany({ where: { userId: testUserId } });
      await db.loan.deleteMany({ where: { userId: testUserId } });
      await db.creditApplication.deleteMany({ where: { userId: testUserId } });
      await db.riskEvent.deleteMany({ where: { userId: testUserId } });
      await db.scoreHistory.deleteMany({ where: { userId: testUserId } });
      await db.bahiScore.deleteMany({ where: { userId: testUserId } });
      await db.transaction.deleteMany({ where: { userId: testUserId } });
      await db.profile.deleteMany({ where: { userId: testUserId } });
      await db.user.deleteMany({ where: { id: testUserId } });
    }
  });

  it('1. Ingests real transactions and persists to database', async () => {
    const today = new Date();
    const txData = [
      {
        userId: testUserId,
        date: new Date(today.getTime() - 25 * 86400000),
        description: 'Delivery trips batch 1',
        amount: 1200,
        type: 'INCOME',
        category: 'Delivery',
        balance: 2400,
        referenceId: `REF_${Date.now()}_1`,
      },
      {
        userId: testUserId,
        date: new Date(today.getTime() - 15 * 86400000),
        description: 'Fuel Refill',
        amount: 300,
        type: 'EXPENSE',
        category: 'Fuel',
        balance: 2100,
        referenceId: `REF_${Date.now()}_2`,
      },
      {
        userId: testUserId,
        date: new Date(today.getTime() - 5 * 86400000),
        description: 'Weekend surge deliveries',
        amount: 1800,
        type: 'INCOME',
        category: 'Delivery',
        balance: 3900,
        referenceId: `REF_${Date.now()}_3`,
      },
    ];

    await db.transaction.createMany({ data: txData });
    const count = await db.transaction.count({ where: { userId: testUserId } });
    expect(count).toBe(3);
  });

  it('2. Recalculates and persists BahiScore snapshot', async () => {
    const result = await recalculateAndPersistScore(testUserId, 'TRANSACTIONS_IMPORTED');
    expect(result.score.score).toBeGreaterThanOrEqual(300);
    expect(result.score.score).toBeLessThanOrEqual(900);
    expect(result.metrics.totalIncome).toBe(3000);
    expect(result.metrics.totalExpenses).toBe(300);
    expect(result.metrics.netCashFlow).toBe(2700);

    const savedInDb = await db.bahiScore.findFirst({ where: { userId: testUserId } });
    expect(savedInDb).not.toBeNull();
    expect(savedInDb?.score).toBe(result.score.score);
  });

  it('3. Submits credit application and undergoes lender underwriting', async () => {
    const app = await db.creditApplication.create({
      data: {
        userId: testUserId,
        requestedAmount: 2000,
        purpose: 'Bike maintenance & fuel',
        tenureWeeks: 4,
        status: 'PENDING',
        riskLevel: 'LOW',
        recommendedLimit: 2500,
      },
    });
    testAppId = app.id;

    expect(app.status).toBe('PENDING');

    // Lender approval action
    const updatedApp = await db.creditApplication.update({
      where: { id: app.id },
      data: {
        status: 'APPROVED',
        reviewedBy: 'lender@bahi.in',
        reviewedAt: new Date(),
        lenderNotes: 'Verified 25-day delivery income. Approved.',
      },
    });
    expect(updatedApp.status).toBe('APPROVED');

    // Loan created
    const loan = await db.loan.create({
      data: {
        applicationId: app.id,
        userId: testUserId,
        principal: 2000,
        interestFee: 60,
        totalPayable: 2060,
        outstandingAmount: 2060,
        tenureWeeks: 4,
        weeklyInstallment: 515,
        status: 'ACTIVE',
        dueDate: new Date(Date.now() + 28 * 86400000),
      },
    });
    testLoanId = loan.id;
    expect(loan.outstandingAmount).toBe(2060);
    expect(loan.status).toBe('ACTIVE');
  });

  it('4. Processes loan repayment and triggers score evolution in DB', async () => {
    // Record repayment
    await db.repayment.create({
      data: {
        loanId: testLoanId,
        userId: testUserId,
        amount: 2060,
        paymentMethod: 'UPI',
        paymentReference: `PAY_UPI_${Date.now()}`,
        status: 'COMPLETED',
        previousOutstanding: 2060,
        newOutstanding: 0,
        notes: 'Full early loan closure',
      },
    });

    // Mark loan completed
    await db.loan.update({
      where: { id: testLoanId },
      data: {
        outstandingAmount: 0,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Recalculate score after completed repayment
    const postRepayResult = await recalculateAndPersistScore(testUserId, 'REPAYMENT_COMPLETED');
    expect(postRepayResult.score.score).toBeGreaterThanOrEqual(300);

    // Verify ScoreHistory was generated
    const histories = await db.scoreHistory.findMany({
      where: { userId: testUserId },
      orderBy: { createdAt: 'desc' },
    });
    expect(histories.length).toBeGreaterThan(0);
    expect(histories[0].triggerReason).toBe('REPAYMENT_COMPLETED');
  });
});

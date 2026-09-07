import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { buildPersonas } from '../data/personas';
import { calculateBahiScore } from '../lib/scoring/engine';
import { calculateCreditDecision } from '../lib/decisions/engine';
import { detectAnomalies, computeCashFlowMetrics } from '../lib/scoring/service';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function main() {
  console.log('🌱 Starting BAHI full-stack database seed...');

  // Clean existing records
  await prisma.auditLog.deleteMany();
  await prisma.repayment.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.creditApplication.deleteMany();
  await prisma.riskEvent.deleteMany();
  await prisma.scoreHistory.deleteMany();
  await prisma.bahiScore.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  const defaultPasswordHash = await hashPassword('Password123!');

  // 1. Create Lender
  const lender = await prisma.user.create({
    data: {
      email: 'lender@bahi.in',
      passwordHash: defaultPasswordHash,
      name: 'Credit Risk Officer (NBFC)',
      role: 'LENDER',
      profile: {
        create: {
          occupation: 'Credit Underwriter',
          businessName: 'FinFlow NBFC Lending Partner',
          city: 'Mumbai',
          phone: '+91 98765 43210',
          coldStartStatus: 'ESTABLISHED',
          starterEligibility: 0,
        },
      },
    },
  });
  console.log('✓ Created Lender account:', lender.email);

  // 2. Create Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@bahi.in',
      passwordHash: defaultPasswordHash,
      name: 'BAHI System Administrator',
      role: 'ADMIN',
      profile: {
        create: {
          occupation: 'System Admin',
          businessName: 'BAHI Intelligence Core',
          city: 'Bengaluru',
          phone: '+91 98765 00000',
          coldStartStatus: 'ESTABLISHED',
          starterEligibility: 0,
        },
      },
    },
  });
  console.log('✓ Created Admin account:', admin.email);

  // 3. Seed 5 Personas
  const personas = buildPersonas();
  const personaEmails: Record<string, string> = {
    new_rider: 'priya@bahi.in',
    cab_driver: 'ravi@bahi.in',
    kirana_merchant: 'amit@bahi.in',
    volatile_gig: 'sunita@bahi.in',
    flagged: 'vikram@bahi.in',
  };

  for (const p of personas) {
    const email = personaEmails[p.id] || `${p.id}@bahi.in`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: defaultPasswordHash,
        name: p.name,
        role: 'BORROWER',
        profile: {
          create: {
            occupation: p.occupation,
            businessName: p.id === 'kirana_merchant' ? 'Patel Daily Grocery' : null,
            city: p.city,
            phone: `+91 9811${Math.floor(100000 + Math.random() * 900000)}`,
            profileAgeDays: p.currentDay || p.score.historyDays || 30,
            coldStartStatus: p.coldStart ? 'BUILDING_PROFILE' : 'ESTABLISHED',
            starterEligibility: p.decision.recommendedLimit,
          },
        },
      },
    });

    console.log(`✓ Created Borrower [${p.name}] -> ${email}`);

    // Insert transactions
    const txData = p.transactions.map((t) => ({
      userId: user.id,
      date: new Date(t.date),
      description: t.description,
      amount: t.amount,
      type: t.type.toUpperCase(),
      category: t.category,
      balance: t.balance,
      referenceId: `${t.date}_${t.amount}_${t.type}_${t.id}`,
    }));

    await prisma.transaction.createMany({
      data: txData,
    });

    // Score & snapshot
    const scoreResult = p.score;
    const getF = (k: string) => scoreResult.factors.find((f) => f.key === k)?.score ?? 50;

    let grade = 'GOOD';
    if (scoreResult.total >= 750) grade = 'EXCELLENT';
    else if (scoreResult.total >= 650) grade = 'GOOD';
    else if (scoreResult.total >= 550) grade = 'FAIR';
    else grade = 'CAUTION';

    await prisma.bahiScore.create({
      data: {
        userId: user.id,
        score: scoreResult.total,
        consistencyScore: getF('consistency'),
        recentActivityScore: getF('recentActivity'),
        incomeTrendScore: getF('incomeTrend'),
        cashBufferScore: getF('cashBuffer'),
        integrityScore: getF('integrity'),
        grade,
        coldStartStatus: p.coldStart ? 'BUILDING_PROFILE' : 'ESTABLISHED',
        historyLengthDays: p.currentDay || scoreResult.historyDays,
        explanation: `Initial underwriting score calculated across ${p.transactions.length} verified transactions.`,
      },
    });

    // Score history entry
    await prisma.scoreHistory.create({
      data: {
        userId: user.id,
        previousScore: Math.max(300, scoreResult.total - 25),
        newScore: scoreResult.total,
        scoreChange: 25,
        triggerReason: 'TRANSACTIONS_IMPORTED',
        factorChangesJson: JSON.stringify(scoreResult.factors),
        eligibilityChangeJson: JSON.stringify({ limit: p.decision.recommendedLimit }),
      },
    });

    // Detect and insert risk events
    const anomalies = detectAnomalies(p.transactions);
    for (const anom of anomalies) {
      await prisma.riskEvent.create({
        data: {
          userId: user.id,
          type: anom.type,
          severity: anom.severity,
          description: anom.description,
          evidenceJson: JSON.stringify(anom.evidence),
        },
      });
    }

    // Sample credit applications and loans
    if (p.id === 'cab_driver') {
      // Ravi has a completed loan and repayment history
      const app = await prisma.creditApplication.create({
        data: {
          userId: user.id,
          requestedAmount: 5000,
          purpose: 'Vehicle maintenance and tyre replacement',
          tenureWeeks: 4,
          status: 'APPROVED',
          riskLevel: 'LOW',
          recommendedLimit: 12000,
          lenderNotes: 'Strong consistency and positive cash buffer. Instant approval.',
          reviewedBy: lender.email,
          reviewedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      });

      const loan = await prisma.loan.create({
        data: {
          applicationId: app.id,
          userId: user.id,
          principal: 5000,
          interestFee: 150,
          totalPayable: 5150,
          outstandingAmount: 0,
          tenureWeeks: 4,
          weeklyInstallment: 1287.5,
          status: 'COMPLETED',
          dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          disbursedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.repayment.create({
        data: {
          loanId: loan.id,
          userId: user.id,
          amount: 5150,
          paymentMethod: 'UPI',
          paymentReference: 'UPI_REF_98374928174',
          status: 'COMPLETED',
          previousOutstanding: 5150,
          newOutstanding: 0,
          notes: 'Full on-time repayment received via UPI AutoPay',
        },
      });
    } else if (p.id === 'new_rider') {
      // Priya has an active starter advance application
      await prisma.creditApplication.create({
        data: {
          userId: user.id,
          requestedAmount: 1000,
          purpose: 'Weekly fuel and mobile recharge advance',
          tenureWeeks: 1,
          status: 'PENDING',
          riskLevel: 'MODERATE',
          recommendedLimit: 1000,
          lenderNotes: '14-day building profile. Eligible for Starter Micro-Advance.',
        },
      });
    } else if (p.id === 'kirana_merchant') {
      // Amit has an active loan
      const app = await prisma.creditApplication.create({
        data: {
          userId: user.id,
          requestedAmount: 10000,
          purpose: 'Festival inventory purchase (cooking oil & pulses)',
          tenureWeeks: 8,
          status: 'APPROVED',
          riskLevel: 'LOW',
          recommendedLimit: 15000,
          lenderNotes: 'Merchant daily counter cash flow verified.',
          reviewedBy: lender.email,
          reviewedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        },
      });

      const loan = await prisma.loan.create({
        data: {
          applicationId: app.id,
          userId: user.id,
          principal: 10000,
          interestFee: 400,
          totalPayable: 10400,
          outstandingAmount: 7800,
          tenureWeeks: 8,
          weeklyInstallment: 1300,
          status: 'ACTIVE',
          dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          disbursedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.repayment.create({
        data: {
          loanId: loan.id,
          userId: user.id,
          amount: 2600,
          paymentMethod: 'UPI',
          paymentReference: 'UPI_REF_AMIT_2600',
          status: 'COMPLETED',
          previousOutstanding: 10400,
          newOutstanding: 7800,
          notes: 'Week 1 & 2 installment payment',
        },
      });
    } else if (p.id === 'flagged') {
      // Vikram has a flagged application under review
      await prisma.creditApplication.create({
        data: {
          userId: user.id,
          requestedAmount: 8000,
          purpose: 'Equipment purchase',
          tenureWeeks: 4,
          status: 'UNDER_REVIEW',
          riskLevel: 'HIGH',
          recommendedLimit: 0,
          lenderNotes: 'Flagged for anomaly: 100% repeated identical amounts and synthetic regularity.',
        },
      });
    }

    // Seed initial audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        actorEmail: 'system@bahi.in',
        actorRole: 'SYSTEM',
        action: 'USER_REGISTERED',
        entity: 'USER',
        entityId: user.id,
        metadataJson: JSON.stringify({ email, name: p.name }),
      },
    });
  }

  console.log('✅ Seed completed successfully! All personas, transactions, scores, and loans initialized in SQLite.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

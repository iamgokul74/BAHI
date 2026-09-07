// ============================================================
// BAHI — Deterministic Persona & Transaction Data
// All dates relative to a fixed reference date for determinism
// ============================================================

import type { Transaction, Persona } from '@/types';
import { calculateBahiScore } from '@/lib/scoring/engine';
import { calculateCreditDecision } from '@/lib/decisions/engine';

// Reference "today" for all generated data
const REF_DATE = new Date('2024-11-15');

function daysAgo(n: number): string {
  const d = new Date(REF_DATE);
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function makeId(prefix: string, i: number): string {
  return `${prefix}_${String(i).padStart(4, '0')}`;
}

// ── Running Balance Helper ───────────────────────────────
function applyBalance(txns: Omit<Transaction, 'balance'>[], startBalance: number): Transaction[] {
  let balance = startBalance;
  return txns.map((t) => {
    if (t.type === 'income' || t.type === 'transfer') {
      balance += t.amount;
    } else {
      balance = Math.max(0, balance - t.amount);
    }
    return { ...t, balance: Math.round(balance) };
  });
}

// ============================================================
// PERSONA 1: New Rider — Priya Sharma (14 days, cold-start)
// ============================================================
const priyaRawTxns: Omit<Transaction, 'balance'>[] = [
  { id: makeId('priya', 1), date: daysAgo(13), type: 'income', amount: 850, category: 'ride_earnings', source: 'RideApp', description: 'Morning rides' },
  { id: makeId('priya', 2), date: daysAgo(13), type: 'expense', amount: 200, category: 'food', source: 'Swiggy', description: 'Lunch' },
  { id: makeId('priya', 3), date: daysAgo(12), type: 'income', amount: 1100, category: 'ride_earnings', source: 'RideApp', description: 'Full day rides' },
  { id: makeId('priya', 4), date: daysAgo(12), type: 'expense', amount: 150, category: 'transport', source: 'Petrol', description: 'Fuel' },
  { id: makeId('priya', 5), date: daysAgo(11), type: 'income', amount: 750, category: 'ride_earnings', source: 'RideApp', description: 'Morning rides' },
  { id: makeId('priya', 6), date: daysAgo(10), type: 'income', amount: 1300, category: 'ride_earnings', source: 'RideApp', description: 'Long trip + surge' },
  { id: makeId('priya', 7), date: daysAgo(10), type: 'expense', amount: 300, category: 'food', source: 'Zomato', description: 'Dinner' },
  { id: makeId('priya', 8), date: daysAgo(9), type: 'income', amount: 920, category: 'ride_earnings', source: 'RideApp', description: 'Evening rides' },
  { id: makeId('priya', 9), date: daysAgo(8), type: 'expense', amount: 500, category: 'utilities', source: 'PhonePe', description: 'Mobile recharge' },
  { id: makeId('priya', 10), date: daysAgo(7), type: 'income', amount: 1050, category: 'ride_earnings', source: 'RideApp', description: 'Weekend boost' },
  { id: makeId('priya', 11), date: daysAgo(6), type: 'income', amount: 1400, category: 'ride_earnings', source: 'RideApp', description: 'Airport trips' },
  { id: makeId('priya', 12), date: daysAgo(6), type: 'expense', amount: 250, category: 'transport', source: 'Petrol', description: 'Fuel' },
  { id: makeId('priya', 13), date: daysAgo(5), type: 'income', amount: 800, category: 'ride_earnings', source: 'RideApp', description: 'Morning rides' },
  { id: makeId('priya', 14), date: daysAgo(4), type: 'income', amount: 1200, category: 'ride_earnings', source: 'RideApp', description: 'Full day' },
  { id: makeId('priya', 15), date: daysAgo(4), type: 'expense', amount: 400, category: 'food', source: 'Zomato', description: 'Groceries' },
  { id: makeId('priya', 16), date: daysAgo(3), type: 'income', amount: 950, category: 'ride_earnings', source: 'RideApp', description: 'Evening rides' },
  { id: makeId('priya', 17), date: daysAgo(2), type: 'income', amount: 1150, category: 'ride_earnings', source: 'RideApp', description: 'Full day rides' },
  { id: makeId('priya', 18), date: daysAgo(1), type: 'income', amount: 880, category: 'ride_earnings', source: 'RideApp', description: 'Morning rides' },
];
const priyaTxns = applyBalance(priyaRawTxns, 800);

// ============================================================
// PERSONA 2: Cab Driver — Ravi Kumar (90 days, strong profile)
// ============================================================
function generateRaviTxns(): Transaction[] {
  const raw: Omit<Transaction, 'balance'>[] = [];
  let id = 1;

  for (let day = 89; day >= 0; day--) {
    const weekday = new Date(daysAgo(day)).getDay();
    const isWeekend = weekday === 0 || weekday === 6;

    // Ravi earns 5–6 days a week, higher on weekends
    if (weekday !== 1) { // rest on Monday
      const base = isWeekend ? 1600 : 1200;
      const variation = Math.round((Math.sin(day * 0.7 + 1.2) * 250) + base);
      const earning = Math.max(800, variation);

      raw.push({
        id: makeId('ravi', id++),
        date: daysAgo(day),
        type: 'income',
        amount: earning,
        category: 'ride_earnings',
        source: 'OlaUber',
        description: isWeekend ? 'Weekend ride earnings' : 'Daily cab earnings',
      });

      // Fuel expense every other day
      if (day % 2 === 0) {
        raw.push({
          id: makeId('ravi', id++),
          date: daysAgo(day),
          type: 'expense',
          amount: Math.round(200 + Math.sin(day) * 50),
          category: 'transport',
          source: 'Petrol Station',
          description: 'Fuel',
        });
      }
    }

    // Weekly food
    if (day % 7 === 3) {
      raw.push({
        id: makeId('ravi', id++),
        date: daysAgo(day),
        type: 'expense',
        amount: 350,
        category: 'food',
        source: 'Kirana Store',
        description: 'Weekly groceries',
      });
    }

    // Monthly rent
    if (day === 30) {
      raw.push({
        id: makeId('ravi', id++),
        date: daysAgo(day),
        type: 'expense',
        amount: 5000,
        category: 'rent',
        source: 'Landlord',
        description: 'Monthly rent',
      });
    }
  }

  return applyBalance(raw, 3500);
}
const raviTxns = generateRaviTxns();

// ============================================================
// PERSONA 3: Kirana Merchant — Amit Patel (60 days)
// ============================================================
function generateAmitTxns(): Transaction[] {
  const raw: Omit<Transaction, 'balance'>[] = [];
  let id = 1;

  for (let day = 59; day >= 0; day--) {
    const weekday = new Date(daysAgo(day)).getDay();
    const isSunday = weekday === 0;

    // Daily sales — multiple small transactions
    const salesCount = isSunday ? 2 : 4;
    for (let s = 0; s < salesCount; s++) {
      const baseAmount = 300 + Math.round(Math.sin(day * 0.4 + s * 1.1) * 150);
      raw.push({
        id: makeId('amit', id++),
        date: daysAgo(day),
        type: 'income',
        amount: Math.max(100, baseAmount),
        category: 'merchant_sales',
        source: 'Shop Counter',
        description: `Daily sales batch ${s + 1}`,
      });
    }

    // Restocking expenses (every 5 days)
    if (day % 5 === 0) {
      raw.push({
        id: makeId('amit', id++),
        date: daysAgo(day),
        type: 'expense',
        amount: Math.round(800 + Math.sin(day * 0.3) * 200),
        category: 'other',
        source: 'Wholesale Market',
        description: 'Inventory restocking',
      });
    }

    // Utility bills (monthly)
    if (day === 15) {
      raw.push({
        id: makeId('amit', id++),
        date: daysAgo(day),
        type: 'expense',
        amount: 1200,
        category: 'utilities',
        source: 'BESCOM',
        description: 'Electricity bill',
      });
    }
  }

  return applyBalance(raw, 2000);
}
const amitTxns = generateAmitTxns();

// ============================================================
// PERSONA 4: Volatile Gig Worker — Sunita Devi (45 days)
// ============================================================
function generateSunitaTxns(): Transaction[] {
  const raw: Omit<Transaction, 'balance'>[] = [];
  let id = 1;

  // Sunita does delivery, some days nothing, some days a lot
  const incomePattern = [
    900, 0, 1800, 0, 0, 2200, 1100,
    0, 1500, 800, 0, 2800, 0, 1200,
    1600, 0, 0, 900, 2100, 1400, 0,
    800, 1900, 0, 1300, 0, 2500, 1100,
    0, 700, 1800, 0, 2200, 900, 0,
    1500, 0, 1200, 2800, 600, 0, 0,
    1700, 1100, 2000,
  ];

  for (let day = 44; day >= 0; day--) {
    const idx = 44 - day;
    const income = incomePattern[idx] || 0;

    if (income > 0) {
      raw.push({
        id: makeId('sunita', id++),
        date: daysAgo(day),
        type: 'income',
        amount: income,
        category: 'delivery_earnings',
        source: 'Swiggy/Zomato',
        description: 'Delivery earnings',
      });
    }

    // Occasional expenses
    if (day % 4 === 0 && income > 0) {
      raw.push({
        id: makeId('sunita', id++),
        date: daysAgo(day),
        type: 'expense',
        amount: Math.round(150 + Math.sin(day) * 80),
        category: 'transport',
        source: 'Petrol',
        description: 'Fuel for bike',
      });
    }

    if (day % 14 === 0) {
      raw.push({
        id: makeId('sunita', id++),
        date: daysAgo(day),
        type: 'expense',
        amount: 600,
        category: 'food',
        source: 'Kirana',
        description: 'Groceries',
      });
    }
  }

  return applyBalance(raw, 1200);
}
const sunitaTxns = generateSunitaTxns();

// ============================================================
// PERSONA 5: Flagged Profile — Vikram Singh (30 days)
// Suspicious: all transactions identical ₹1,250
// ============================================================
function generateVikramTxns(): Transaction[] {
  const raw: Omit<Transaction, 'balance'>[] = [];
  let id = 1;

  // Perfectly identical amounts every single day — suspicious
  for (let day = 29; day >= 0; day--) {
    raw.push({
      id: makeId('vikram', id++),
      date: daysAgo(day),
      type: 'income',
      amount: 1250, // Identical every day
      category: 'freelance',
      source: 'Unknown Platform',
      description: 'Payment received',
    });

    // Same expense every day too
    if (day % 3 === 0) {
      raw.push({
        id: makeId('vikram', id++),
        date: daysAgo(day),
        type: 'expense',
        amount: 500, // Also identical
        category: 'other',
        source: 'Transfer',
        description: 'Transfer out',
      });
    }
  }

  return applyBalance(raw, 500);
}
const vikramTxns = generateVikramTxns();

// ============================================================
// Build Personas
// ============================================================
export function buildPersonas(): Persona[] {
  const personas: Persona[] = [
    {
      id: 'new_rider',
      name: 'Priya Sharma',
      avatar: '🛵',
      occupation: 'New Ride-Share Driver',
      city: 'Bengaluru',
      age: 24,
      transactions: priyaTxns,
      score: calculateBahiScore(priyaTxns),
      decision: calculateCreditDecision(calculateBahiScore(priyaTxns), priyaTxns),
      coldStart: true,
      daysRequired: 21,
      currentDay: 14,
      insights: [
        'Account is in the profile-building phase — 14 days observed',
        'Income appears consistently from ride-share activity',
        'Starter advance available from day 14 onward',
        'Full credit limit unlocks after day 21',
      ],
    },
    {
      id: 'cab_driver',
      name: 'Ravi Kumar',
      avatar: '🚕',
      occupation: 'Cab Driver',
      city: 'Mumbai',
      age: 35,
      transactions: raviTxns,
      score: calculateBahiScore(raviTxns),
      decision: calculateCreditDecision(calculateBahiScore(raviTxns), raviTxns),
      coldStart: false,
      insights: [
        `Active on ${countActiveDays(raviTxns)} of last 90 days`,
        'Stable weekly earnings consistent with full-time cab driving',
        'Cash buffer is healthy — above 1 month of income',
        'Transaction pattern shows no suspicious repetition',
        'Eligible for maximum credit tier',
      ],
    },
    {
      id: 'kirana_merchant',
      name: 'Amit Patel',
      avatar: '🏪',
      occupation: 'Kirana Shop Owner',
      city: 'Ahmedabad',
      age: 42,
      transactions: amitTxns,
      score: calculateBahiScore(amitTxns),
      decision: calculateCreditDecision(calculateBahiScore(amitTxns), amitTxns),
      coldStart: false,
      insights: [
        'Multiple small transactions daily — consistent with retail business',
        'Regular restocking expenses indicate active business operations',
        'Moderate cash buffer — typical for small retail merchants',
        'Healthy business activity over 60 days',
      ],
    },
    {
      id: 'volatile_gig',
      name: 'Sunita Devi',
      avatar: '🛺',
      occupation: 'Food Delivery Rider',
      city: 'Delhi',
      age: 28,
      transactions: sunitaTxns,
      score: calculateBahiScore(sunitaTxns),
      decision: calculateCreditDecision(calculateBahiScore(sunitaTxns), sunitaTxns),
      coldStart: false,
      insights: [
        'Income is volatile but the pattern is consistent with gig delivery work',
        'Irregular working days are expected for delivery platform workers',
        'Income spikes on weekends and festival periods',
        'BAHI recognizes legitimate gig-work volatility — not penalized',
        'Cash buffer is the primary limiting factor for higher eligibility',
      ],
    },
    {
      id: 'flagged',
      name: 'Vikram Singh',
      avatar: '⚠️',
      occupation: 'Freelancer',
      city: 'Pune',
      age: 31,
      transactions: vikramTxns,
      score: calculateBahiScore(vikramTxns),
      decision: calculateCreditDecision(calculateBahiScore(vikramTxns), vikramTxns),
      coldStart: false,
      insights: [
        '⚠️ ANOMALY: 100% of income transactions have identical amounts (₹1,250)',
        '⚠️ Suspiciously uniform transaction timing detected',
        'Genuine gig workers typically show natural income variation',
        'This pattern may indicate synthetic or automated transaction activity',
        'Additional identity verification recommended before any credit decision',
      ],
    },
  ];

  return personas;
}

function countActiveDays(txns: Transaction[]): number {
  const cutoff = new Date(REF_DATE);
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const recentIncome = txns.filter(
    (t) => t.type === 'income' && t.date >= cutoffStr
  );
  return new Set(recentIncome.map((t) => t.date)).size;
}

// Singleton personas cache
let _personas: Persona[] | null = null;

export function getPersonas(): Persona[] {
  if (!_personas) {
    _personas = buildPersonas();
  }
  return _personas;
}

export function getPersonaById(id: string): Persona | undefined {
  return getPersonas().find((p) => p.id === id);
}

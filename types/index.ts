// ============================================================
// BAHI — Core TypeScript Types
// ============================================================

export type Language = 'en' | 'hi' | 'ta';
export type View = 'worker' | 'lender';

// ── Transaction ────────────────────────────────────────────
export type TransactionType = 'income' | 'expense' | 'transfer' | 'repayment';
export type TransactionCategory =
  | 'ride_earnings'
  | 'delivery_earnings'
  | 'merchant_sales'
  | 'freelance'
  | 'food'
  | 'transport'
  | 'utilities'
  | 'rent'
  | 'loan_repayment'
  | 'transfer_in'
  | 'transfer_out'
  | 'other';

export interface Transaction {
  id: string;
  date: string; // ISO 8601 date string YYYY-MM-DD
  type: TransactionType;
  amount: number; // INR
  category: TransactionCategory | string;
  source?: string;
  balance: number; // running balance after transaction
  description: string;
}

// ── Scoring ────────────────────────────────────────────────
export interface FactorScore {
  name: string;
  key: 'consistency' | 'recentActivity' | 'incomeTrend' | 'cashBuffer' | 'integrity';
  score: number; // 0–100
  weight: number; // percentage weight, e.g. 35
  explanation: string;
  status: 'strong' | 'moderate' | 'weak';
}

export interface BahiScore {
  total: number; // 300–900
  factors: FactorScore[];
  riskCategory: 'low' | 'medium' | 'high' | 'building';
  confidence: number; // 0–100
  historyDays: number;
  lastUpdated: string;
}

// ── Credit Decision ────────────────────────────────────────
export type DecisionType = 'approve' | 'review' | 'starter_advance' | 'decline';

export interface CreditDecision {
  type: DecisionType;
  recommendedLimit: number; // INR
  maxLimit: number; // INR
  repaymentDays: number;
  repaymentConfidence: number; // 0–100
  reasons: string[];
  improvements: string[];
}

// ── Advance ────────────────────────────────────────────────
export type AdvanceStatus = 'none' | 'active' | 'repaid' | 'overdue';

export interface Repayment {
  dueDate: string;
  amount: number;
  status: 'upcoming' | 'paid' | 'overdue';
  paidDate?: string;
}

export interface Advance {
  id: string;
  amount: number; // INR
  requestDate: string;
  repaymentAmount: number;
  repaymentDays: number;
  status: AdvanceStatus;
  repayments: Repayment[];
  scoreAtAdvance: number;
  scoreAfterRepayment?: number;
  limitBeforeRepayment?: number;
  limitAfterRepayment?: number;
}

// ── Persona ────────────────────────────────────────────────
export type PersonaId =
  | 'new_rider'
  | 'cab_driver'
  | 'kirana_merchant'
  | 'volatile_gig'
  | 'flagged';

export interface Persona {
  id: PersonaId;
  name: string;
  avatar: string; // emoji
  occupation: string;
  city: string;
  age: number;
  transactions: Transaction[];
  score: BahiScore;
  decision: CreditDecision;
  advance?: Advance;
  insights: string[];
  coldStart: boolean;
  daysRequired?: number; // for cold-start
  currentDay?: number; // for cold-start
}

// ── Lender ─────────────────────────────────────────────────
export interface LenderStats {
  totalApplicants: number;
  lowRisk: number;
  mediumRisk: number;
  highRisk: number;
  building: number;
  totalEligibleCredit: number;
  activeAdvances: number;
  repaymentPerformance: number; // percentage
  potentialRiskExposure: number;
}

export interface ApplicantRow {
  personaId: PersonaId;
  name: string;
  score: number;
  risk: 'low' | 'medium' | 'high' | 'building';
  suggestedLimit: number;
  decision: DecisionType;
  repaymentConfidence: number;
}

// ── Insights ────────────────────────────────────────────────
export interface Insight {
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  message: string;
  factor?: string;
}

// ── Score Evolution ─────────────────────────────────────────
export interface ScorePoint {
  date: string;
  score: number;
  event?: string;
}

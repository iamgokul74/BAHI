'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Persona, PersonaId, Language, View, Advance, Transaction as AppTransaction } from '@/types';
import { getPersonas } from '@/data/personas';
import { calculateRepaymentAmount, calculateScoreAfterRepayment, calculateNewLimit, calculateCreditDecision } from '@/lib/decisions/engine';
import { calculateBahiScore } from '@/lib/scoring/engine';

export interface BackendUser {
  id: string;
  email: string;
  name: string;
  role: 'BORROWER' | 'LENDER' | 'ADMIN';
  profile?: {
    occupation: string;
    city: string;
    businessName?: string | null;
    phone?: string | null;
    profileAgeDays: number;
    coldStartStatus: string;
    starterEligibility: number;
  } | null;
  currentScore?: {
    id: string;
    score: number;
    consistencyScore: number;
    recentActivityScore: number;
    incomeTrendScore: number;
    cashBufferScore: number;
    integrityScore: number;
    grade: string;
    coldStartStatus: string;
    historyLengthDays: number;
  } | null;
  activeLoan?: any | null;
  latestApplication?: any | null;
  riskEvents?: any[];
  scoreHistories?: any[];
  transactionCount?: number;
}

interface AppState {
  view: View;
  language: Language;
  selectedPersonaId: PersonaId;
  personas: Persona[];
  activePersona: Persona;
  activeAdvance: Advance | null;
  advanceState: 'none' | 'requesting' | 'active' | 'repaid';
  scoreAfterRepayment: number | null;
  newLimitAfterRepayment: number | null;
  // Full-stack backend state
  currentUser: BackendUser | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  setView: (v: View) => void;
  setLanguage: (l: Language) => void;
  setPersona: (id: PersonaId) => void;
  switchDemoPersona: (key: string) => Promise<void>;
  refreshData: () => Promise<void>;
  requestAdvance: (amount: number, purpose?: string) => Promise<void>;
  simulateRepayment: (amount?: number) => Promise<void>;
  resetAdvance: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const fallbackPersonas = useMemo(() => getPersonas(), []);
  const [view, setView] = useState<View>('worker');
  const [language, setLanguage] = useState<Language>('en');
  const [selectedPersonaId, setSelectedPersonaId] = useState<PersonaId>('cab_driver');
  const [currentUser, setCurrentUser] = useState<BackendUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [liveTransactions, setLiveTransactions] = useState<AppTransaction[]>([]);

  const [activeAdvance, setActiveAdvance] = useState<Advance | null>(null);
  const [advanceState, setAdvanceState] = useState<'none' | 'requesting' | 'active' | 'repaid'>('none');
  const [scoreAfterRepayment, setScoreAfterRepayment] = useState<number | null>(null);
  const [newLimitAfterRepayment, setNewLimitAfterRepayment] = useState<number | null>(null);

  // Fetch current session and DB state
  const refreshData = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();

      if (data.user) {
        setCurrentUser(data.user);

        // Fetch user's real transactions
        const txRes = await fetch(`/api/transactions?limit=200`);
        if (txRes.ok) {
          const txData = await txRes.json();
          if (txData.transactions) {
            setLiveTransactions(txData.transactions);
          }
        }

        // Set active loan state if any
        if (data.user.activeLoan && data.user.activeLoan.status === 'ACTIVE') {
          const loan = data.user.activeLoan;
          setActiveAdvance({
            id: loan.id,
            amount: loan.principal,
            requestDate: loan.disbursedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
            repaymentAmount: loan.totalPayable,
            repaymentDays: loan.tenureWeeks * 7,
            status: 'active',
            repayments: [
              {
                dueDate: loan.dueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                amount: loan.outstandingAmount,
                status: 'upcoming',
              },
            ],
            scoreAtAdvance: data.user.currentScore?.score || 650,
          });
          setAdvanceState('active');
        } else if (data.user.activeLoan && data.user.activeLoan.status === 'COMPLETED') {
          setAdvanceState('repaid');
        }
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Switch demo persona
  const switchDemoPersona = useCallback(
    async (key: string) => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/auth/switch-demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personaKey: key }),
        });
        if (res.ok) {
          if (key === 'lender') {
            setView('lender');
          } else {
            setSelectedPersonaId(key as PersonaId);
            setView('worker');
          }
          await refreshData();
        }
      } catch (err) {
        console.error('Error switching demo:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [refreshData]
  );

  // Active persona synthesis combining fallback and live DB calculations
  const activePersona: Persona = useMemo(() => {
    const base = fallbackPersonas.find((p) => p.id === selectedPersonaId) || fallbackPersonas[0];

    if (currentUser && liveTransactions.length > 0) {
      const liveScore = calculateBahiScore(liveTransactions);
      const liveDecision = calculateCreditDecision(liveScore, liveTransactions);
      const isCold = (currentUser.profile?.profileAgeDays || liveScore.historyDays) < 21;

      return {
        id: selectedPersonaId,
        name: currentUser.name,
        avatar: base.avatar || '👤',
        occupation: currentUser.profile?.occupation || base.occupation,
        city: currentUser.profile?.city || base.city,
        age: 28,
        transactions: liveTransactions,
        score: liveScore,
        decision: liveDecision,
        coldStart: isCold,
        daysRequired: 21,
        currentDay: currentUser.profile?.profileAgeDays || liveScore.historyDays,
        insights: [
          `Verified across ${liveTransactions.length} transactions in database`,
          `Current Profile Status: ${currentUser.profile?.coldStartStatus || 'ESTABLISHED'}`,
          `Observed History: ${liveScore.historyDays} days`,
          `Net Cash Flow: ₹${(liveScore.factors.find(f => f.key === 'cashBuffer')?.score || 50) > 40 ? 'Positive' : 'Constrained'}`,
        ],
      };
    }

    return base;
  }, [fallbackPersonas, selectedPersonaId, currentUser, liveTransactions]);

  const setPersona = useCallback(
    (id: PersonaId) => {
      setSelectedPersonaId(id);
      setActiveAdvance(null);
      setAdvanceState('none');
      setScoreAfterRepayment(null);
      setNewLimitAfterRepayment(null);
      // Auto switch demo in DB session
      switchDemoPersona(id);
    },
    [switchDemoPersona]
  );

  const requestAdvance = useCallback(
    async (amount: number, purpose = 'Working capital & fuel advance') => {
      try {
        const res = await fetch('/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestedAmount: amount,
            purpose,
            tenureWeeks: 4,
          }),
        });

        if (res.ok) {
          // In demo/test mode, auto-trigger approved advance
          const score = activePersona.score;
          const repaymentAmount = calculateRepaymentAmount(amount, activePersona.decision.repaymentDays, score.total);
          const today = new Date().toISOString().split('T')[0];
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (activePersona.decision.repaymentDays || 28));

          setActiveAdvance({
            id: `adv_${Date.now()}`,
            amount,
            requestDate: today,
            repaymentAmount,
            repaymentDays: activePersona.decision.repaymentDays || 28,
            status: 'active',
            repayments: [
              {
                dueDate: dueDate.toISOString().split('T')[0],
                amount: repaymentAmount,
                status: 'upcoming',
              },
            ],
            scoreAtAdvance: score.total,
          });
          setAdvanceState('active');
          await refreshData();
        }
      } catch (err) {
        console.error('Advance request error:', err);
      }
    },
    [activePersona, refreshData]
  );

  const simulateRepayment = useCallback(async () => {
    try {
      // If there is an active loan in DB, make real API repayment
      if (currentUser?.activeLoan && currentUser.activeLoan.id) {
        const res = await fetch('/api/repayments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            loanId: currentUser.activeLoan.id,
            amount: currentUser.activeLoan.outstandingAmount || currentUser.activeLoan.totalPayable,
            paymentMethod: 'UPI',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setScoreAfterRepayment(data.scoreEvolution.newScore);
          setNewLimitAfterRepayment(data.scoreEvolution.starterEligibility);
          setAdvanceState('repaid');
          await refreshData();
          return;
        }
      }

      // Fallback local calculation
      if (!activeAdvance) return;
      const newScore = calculateScoreAfterRepayment(activeAdvance.scoreAtAdvance);
      const txns = activePersona.transactions;
      const incomeTxns = txns.filter((t) => t.type === 'income');
      const totalIncome = incomeTxns.reduce((a, t) => a + t.amount, 0);
      const historyDays = Math.max(1, calculateBahiScore(txns).historyDays);
      const monthlyIncome = (totalIncome / historyDays) * 30;
      const newLimit = calculateNewLimit(activePersona.decision.recommendedLimit, newScore, monthlyIncome);

      setActiveAdvance((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'repaid',
          scoreAfterRepayment: newScore,
          limitBeforeRepayment: prev.amount,
          limitAfterRepayment: newLimit,
          repayments: prev.repayments.map((r, i) =>
            i === 0 ? { ...r, status: 'paid', paidDate: new Date().toISOString().split('T')[0] } : r
          ),
        };
      });

      setScoreAfterRepayment(newScore);
      setNewLimitAfterRepayment(newLimit);
      setAdvanceState('repaid');
    } catch (err) {
      console.error('Repayment error:', err);
    }
  }, [currentUser, activeAdvance, activePersona, refreshData]);

  const resetAdvance = useCallback(() => {
    setActiveAdvance(null);
    setAdvanceState('none');
    setScoreAfterRepayment(null);
    setNewLimitAfterRepayment(null);
  }, []);

  const value: AppState = {
    view,
    language,
    selectedPersonaId,
    personas: fallbackPersonas,
    activePersona,
    activeAdvance,
    advanceState,
    scoreAfterRepayment,
    newLimitAfterRepayment,
    currentUser,
    isLoading,
    isAuthModalOpen,
    setIsAuthModalOpen,
    setView,
    setLanguage,
    setPersona,
    switchDemoPersona,
    refreshData,
    requestAdvance,
    simulateRepayment,
    resetAdvance,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

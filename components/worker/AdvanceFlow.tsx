'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/AppContext';
import type { Language } from '@/types';
import { t } from '@/lib/i18n/translations';
import { calculateRepaymentAmount } from '@/lib/decisions/engine';
import { ScoreEvolutionChart } from '@/components/charts/Charts';
import { generateScoreEvolution } from '@/lib/scoring/engine';
import { CheckCircle2, Clock, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';

interface Props {
  language: Language;
}

export default function AdvanceFlow({ language }: Props) {
  const {
    activePersona,
    activeAdvance,
    advanceState,
    scoreAfterRepayment,
    newLimitAfterRepayment,
    currentUser,
    requestAdvance,
    simulateRepayment,
    resetAdvance,
  } = useApp();

  const [requestedAmount, setRequestedAmount] = useState<number>(
    Math.max(500, Math.floor(((activePersona.decision.recommendedLimit || 2000) * 0.6) / 500) * 500)
  );
  const [purpose, setPurpose] = useState('Vehicle maintenance & operational fuel advance');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const decision = activePersona.decision;
  const score = activePersona.score;
  const repaymentAmt = calculateRepaymentAmount(requestedAmount, decision.repaymentDays || 28, score.total);
  const fee = repaymentAmt - requestedAmount;

  const handleConfirmAdvance = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await requestAdvance(requestedAmount, purpose);
      setFeedback('Advance application submitted and active in database!');
    } catch (err: any) {
      setFeedback(err.message || 'Failed to request advance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRepayment = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await simulateRepayment();
      setFeedback('Repayment recorded! Loan settled & score upgraded in database.');
    } catch (err: any) {
      setFeedback(err.message || 'Failed to process repayment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Not eligible
  if (decision.recommendedLimit === 0 && !activeAdvance) {
    return (
      <div className="card" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: 'var(--space-10)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>🚫</div>
        <h2 style={{ marginBottom: 'var(--space-3)' }}>Not Eligible for Advance</h2>
        <p className="text-secondary mb-4">{decision.reasons[0]}</p>
        <div style={{ display: 'grid', gap: 'var(--space-2)', textAlign: 'left', maxWidth: 400, margin: '0 auto' }}>
          {decision.improvements.map((imp, i) => (
            <div key={i} className="insight-item neutral">
              <span>→</span>
              <span>{imp}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── STEP 1: Request ──────────────────────────────────────
  if (advanceState === 'none') {
    const maxLim = decision.recommendedLimit || 2000;

    return (
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <div className={`decision-badge ${decision.type}`} style={{ display: 'inline-flex', marginBottom: 'var(--space-3)' }}>
              {t(language, `decision_${decision.type}` as Parameters<typeof t>[1])}
            </div>
            <h2 style={{ marginBottom: 'var(--space-1)' }}>{t(language, 'requestAdvance')}</h2>
            <p className="text-sm text-muted">Eligible Verified Limit: ₹{maxLim.toLocaleString('en-IN')}</p>
          </div>

          {feedback && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                backgroundColor: '#F0FDF4',
                color: '#166534',
                borderRadius: '6px',
                fontSize: '0.85rem',
              }}
            >
              {feedback}
            </div>
          )}

          {/* Amount Slider */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <label className="text-sm font-semibold" htmlFor="advance-slider">
                {t(language, 'advanceAmount')}
              </label>
              <span className="text-sm font-bold text-bahi inr-amount">
                ₹{requestedAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <input
              id="advance-slider"
              type="range"
              min={500}
              max={maxLim}
              step={500}
              value={requestedAmount}
              onChange={(e) => setRequestedAmount(Number(e.target.value))}
              aria-label="Select advance amount"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-muted">₹500</span>
              <span className="text-xs text-muted">₹{maxLim.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Purpose Input */}
          <div className="mb-6">
            <label className="text-sm font-semibold mb-2" style={{ display: 'block' }}>
              Advance Purpose
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Fuel, inventory, maintenance"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
              }}
            />
          </div>

          {/* Summary */}
          <div
            style={{
              background: 'var(--color-paper-warm)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-6)',
            }}
          >
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted">Advance amount</span>
              <span className="font-semibold inr-amount">₹{requestedAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted">Service Fee (3%)</span>
              <span className="font-semibold inr-amount">₹{fee.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8, marginTop: 4 }}>
              <div className="flex justify-between">
                <span className="font-semibold">{t(language, 'repaymentAmount')}</span>
                <span className="font-bold text-bahi inr-amount">₹{repaymentAmt.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-xs text-muted mt-1">Tenure: {decision.repaymentDays || 28} days (flexible weekly installment)</p>
            </div>
          </div>

          {/* Score Impact */}
          <div className="insight-item positive mb-4" style={{ padding: '10px 14px' }}>
            <span>📈</span>
            <span className="text-sm">
              Successful repayment directly upgrades your Bahi Score ({score.total} → {Math.min(900, score.total + 20)}+) and expands your institutional credit limit.
            </span>
          </div>

          <button
            id="confirm-advance-btn"
            disabled={isSubmitting}
            className="btn btn-primary btn-full btn-lg"
            onClick={handleConfirmAdvance}
          >
            {isSubmitting ? 'Processing Application...' : `${t(language, 'confirmAdvance')} — ₹${requestedAmount.toLocaleString('en-IN')}`}
          </button>
        </div>
      </div>
    );
  }

  // ── STEP 2: Active ──────────────────────────────────────
  if (advanceState === 'active' && activeAdvance) {
    const outstanding = currentUser?.activeLoan?.outstandingAmount ?? activeAdvance.repaymentAmount;

    return (
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="card">
          {/* Active Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-3)',
              background: 'var(--color-green-bg)',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid #86efac',
              marginBottom: 'var(--space-6)',
            }}
          >
            <span style={{ color: 'var(--color-green)', fontSize: '1.5rem' }}>💵</span>
            <div>
              <p className="font-bold text-green">{t(language, 'advanceActive')}</p>
              <p className="text-xs text-muted">Disbursed on {activeAdvance.requestDate}</p>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <p className="text-sm text-muted mb-1">Principal Disbursed</p>
            <p className="advance-amount-display">₹{activeAdvance.amount.toLocaleString('en-IN')}</p>
            <p className="text-sm font-semibold" style={{ color: '#DC2626', marginTop: '4px' }}>
              Current Outstanding Balance: ₹{outstanding.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Repayment Details */}
          <div
            style={{
              background: 'var(--color-paper-warm)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <h4 className="font-semibold mb-3">{t(language, 'repaymentSchedule')}</h4>
            {activeAdvance.repayments.map((r, i) => (
              <div key={i} className={`repayment-item ${r.status}`}>
                <div
                  className="status-dot"
                  style={{
                    background:
                      r.status === 'paid' ? 'var(--color-green)' : r.status === 'overdue' ? 'var(--color-red)' : 'var(--color-bahi)',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <p className="font-semibold">₹{outstanding.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-muted">Due Date: {r.dueDate}</p>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color:
                      r.status === 'paid' ? 'var(--color-green)' : r.status === 'overdue' ? 'var(--color-red)' : 'var(--color-bahi)',
                    textTransform: 'capitalize',
                  }}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>

          <div className="insight-item neutral mb-4" style={{ padding: '10px 14px' }}>
            <span>ℹ</span>
            <span className="text-sm">
              Score at disbursement: {activeAdvance.scoreAtAdvance}. Repaying on time updates your behavioral credit history.
            </span>
          </div>

          <button
            id="simulate-repayment-btn"
            disabled={isSubmitting}
            className="btn btn-success btn-full btn-lg"
            onClick={handleRepayment}
          >
            ✓ {isSubmitting ? 'Recording Repayment...' : `${t(language, 'simulateRepayment')} (UPI AutoPay)`}
          </button>
        </div>
      </div>
    );
  }

  // ── STEP 3: Repaid + Score Evolution ──────────────────────
  if (advanceState === 'repaid') {
    const beforeScore = activeAdvance?.scoreAtAdvance || activePersona.score.total - 15;
    const afterScore = scoreAfterRepayment || activePersona.score.total;
    const scoreEvolution = generateScoreEvolution(activePersona.transactions);

    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="card animate-fade-in">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-2)' }}>🎉</div>
            <h2 style={{ color: 'var(--color-green)', marginBottom: 'var(--space-1)' }}>
              {t(language, 'repaymentComplete')}
            </h2>
            <p className="text-secondary">Advance fully settled in persistent database</p>
          </div>

          {/* Score Evolution */}
          <div className="score-evolution-box mb-6">
            <div className="score-evolution-before">
              <p className="text-xs text-muted mb-1">Previous</p>
              <p className="evolution-score-num before">{beforeScore}</p>
              <p className="text-xs text-muted">Bahi Score</p>
            </div>
            <div className="evolution-arrow">→</div>
            <div className="score-evolution-after">
              <p className="text-xs text-muted mb-1">Updated</p>
              <p className="evolution-score-num after">{afterScore}</p>
              <p className="text-xs text-muted">Bahi Score</p>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-green)' }}>
                +{Math.max(1, afterScore - beforeScore)}
              </p>
              <p className="text-xs text-green">points gained</p>
              {newLimitAfterRepayment && (
                <p className="text-xs text-muted mt-1">
                  New Limit: ₹{newLimitAfterRepayment.toLocaleString('en-IN')}
                </p>
              )}
            </div>
          </div>

          {/* Score Timeline */}
          <div className="card-header">
            <h3 className="card-title">📈 {t(language, 'scoreEvolution')}</h3>
          </div>
          <ScoreEvolutionChart points={scoreEvolution} />

          <div className="insight-item positive mt-4" style={{ padding: '12px 16px' }}>
            <span>✓</span>
            <div>
              <p className="font-semibold">Repayment History Recorded</p>
              <p className="text-sm">
                Positive on-time repayment is permanently recorded in your credit history. Your next micro-advance limit is increased.
              </p>
            </div>
          </div>

          <button
            id="request-new-advance-btn"
            className="btn btn-primary btn-full mt-4"
            onClick={resetAdvance}
          >
            Apply for Next Tier Advance →
          </button>
        </div>
      </div>
    );
  }

  return null;
}

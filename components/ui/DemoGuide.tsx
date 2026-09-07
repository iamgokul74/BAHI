'use client';

import React, { useState } from 'react';

const DEMO_STEPS = [
  {
    title: 'Meet Priya — New Gig Worker',
    body: 'She earns regularly but has no formal credit history. BAHI starts building her profile from day one.',
    persona: 'new_rider',
    tab: 'overview',
    icon: '🛵',
  },
  {
    title: 'Cold-Start Credit',
    body: 'With only 14 days of history, BAHI offers a responsible Starter Advance instead of a full limit. Day 21 unlocks more.',
    persona: 'new_rider',
    tab: 'advance',
    icon: '🏗️',
  },
  {
    title: 'Switch to Ravi — Stable Cab Driver',
    body: '90 days of consistent earnings. BAHI scores him 750+ — Low Risk. Full credit limit approved.',
    persona: 'cab_driver',
    tab: 'overview',
    icon: '🚕',
  },
  {
    title: 'Explainable Score Breakdown',
    body: 'Every factor is shown transparently: what contributed, what limited the score, and what Ravi can improve.',
    persona: 'cab_driver',
    tab: 'factors',
    icon: '🔍',
  },
  {
    title: 'Request & Repay an Advance',
    body: 'Ravi takes an advance. After repayment, his Bahi Score improves and his future limit increases automatically.',
    persona: 'cab_driver',
    tab: 'advance',
    icon: '💵',
  },
  {
    title: 'Sunita — Volatile Gig Worker',
    body: 'Her income fluctuates heavily. BAHI recognises this as legitimate gig-work behaviour — not penalised.',
    persona: 'volatile_gig',
    tab: 'insights',
    icon: '🛺',
  },
  {
    title: 'Vikram — Flagged Profile',
    body: 'Every transaction is ₹1,250. BAHI detects suspicious repetition and flags the profile — protecting lenders.',
    persona: 'flagged',
    tab: 'factors',
    icon: '⚠️',
  },
  {
    title: 'Switch to Lender View',
    body: 'Lenders see the full applicant portfolio — risk tiers, eligibility amounts, repayment confidence — all in one place.',
    persona: 'cab_driver',
    tab: 'overview',
    icon: '🏦',
  },
];

interface Props {
  onClose: () => void;
}

export default function DemoGuide({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const current = DEMO_STEPS[step];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,33,51,0.65)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="BAHI Demo Guide"
    >
      <div
        style={{
          background: 'var(--color-paper-card)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-8)',
          maxWidth: 480,
          width: '100%',
          boxShadow: 'var(--shadow-lg)',
          animation: 'fadeIn 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--color-bahi-bg)',
              color: 'var(--color-bahi)',
              padding: '4px 12px',
              borderRadius: 99,
              fontSize: '0.75rem',
              fontWeight: 700,
              marginBottom: 'var(--space-2)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Demo Guide · Step {step + 1} of {DEMO_STEPS.length}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-ink-muted)' }}
            aria-label="Close demo guide"
            id="demo-guide-close-btn"
          >
            ×
          </button>
        </div>

        {/* Step Content */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-4)' }}>{current.icon}</div>
          <h2 style={{ marginBottom: 'var(--space-3)', fontSize: '1.25rem' }}>{current.title}</h2>
          <p style={{ color: 'var(--color-ink-secondary)', lineHeight: 1.7, fontSize: '0.9375rem' }}>{current.body}</p>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 'var(--space-6)' }}>
          {DEMO_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              style={{
                width: i === step ? 24 : 8,
                height: 8,
                borderRadius: 99,
                background: i === step ? 'var(--color-bahi)' : 'var(--color-border)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                padding: 0,
              }}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          {step > 0 && (
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setStep(s => s - 1)}
              id="demo-prev-btn"
            >
              ← Previous
            </button>
          )}
          {step < DEMO_STEPS.length - 1 ? (
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => setStep(s => s + 1)}
              id="demo-next-btn"
            >
              Next →
            </button>
          ) : (
            <button
              className="btn btn-success"
              style={{ flex: 1 }}
              onClick={onClose}
              id="demo-finish-btn"
            >
              🚀 Start Exploring
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

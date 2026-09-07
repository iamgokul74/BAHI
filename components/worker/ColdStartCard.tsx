'use client';

import React from 'react';
import type { Language } from '@/types';
import { t } from '@/lib/i18n/translations';

interface Props {
  currentDay: number;
  daysRequired: number;
  language: Language;
}

export default function ColdStartCard({ currentDay, daysRequired, language }: Props) {
  const progress = Math.min(100, (currentDay / daysRequired) * 100);
  const starterUnlocked = currentDay >= 14;
  const fullUnlocked = currentDay >= daysRequired;

  const milestones = [
    { day: 7, label: 'Week 1', done: currentDay >= 7 },
    { day: 14, label: 'Starter', done: currentDay >= 14, highlight: true },
    { day: 21, label: 'Full', done: currentDay >= 21, highlight: true },
  ];

  return (
    <div className="cold-start-card">
      <div className="flex items-center gap-2 mb-2">
        <span style={{ fontSize: '1.25rem' }}>🏗️</span>
        <h3 style={{ color: 'var(--color-bahi-dark)', fontWeight: 700, fontSize: '1rem' }}>
          {t(language, 'buildingProfile')}
        </h3>
      </div>
      <p className="text-sm mb-4" style={{ color: 'var(--color-bahi-dark)', opacity: 0.75 }}>
        {t(language, 'coldStartMessage')}
      </p>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-xs font-semibold text-bahi">Day {currentDay} of {daysRequired}</span>
          <span className="text-xs text-muted">{Math.round(progress)}% complete</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Milestones */}
      <div className="flex gap-2 flex-wrap">
        {milestones.map((m) => (
          <div
            key={m.day}
            style={{
              flex: '1 1 70px',
              padding: '6px 10px',
              borderRadius: 'var(--radius-md)',
              background: m.done ? 'var(--color-bahi)' : 'white',
              border: `1.5px solid ${m.done ? 'var(--color-bahi)' : 'var(--color-border)'}`,
              textAlign: 'center',
              opacity: m.highlight && !m.done ? 1 : m.done ? 1 : 0.6,
            }}
          >
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: m.done ? 'white' : 'var(--color-ink-muted)' }}>
              Day {m.day}
            </p>
            <p style={{ fontSize: '0.65rem', color: m.done ? 'rgba(255,255,255,0.8)' : 'var(--color-ink-tertiary)' }}>
              {m.done ? '✓ ' : ''}{m.label}
            </p>
          </div>
        ))}
      </div>

      {/* Status Messages */}
      <div className="mt-3">
        {starterUnlocked && !fullUnlocked && (
          <div className="insight-item positive" style={{ padding: '8px 12px' }}>
            <span>✓</span>
            <span style={{ fontSize: '0.8rem' }}>
              {t(language, 'starterLimitUnlocked')} — ₹1,000 advance available now
            </span>
          </div>
        )}
        {!starterUnlocked && (
          <div className="insight-item neutral" style={{ padding: '8px 12px' }}>
            <span>⏳</span>
            <span style={{ fontSize: '0.8rem' }}>
              {daysRequired - currentDay} more days to unlock full credit limit
            </span>
          </div>
        )}
        {fullUnlocked && (
          <div className="insight-item positive" style={{ padding: '8px 12px' }}>
            <span>🎉</span>
            <span style={{ fontSize: '0.8rem' }}>Full credit limit unlocked!</span>
          </div>
        )}
      </div>
    </div>
  );
}

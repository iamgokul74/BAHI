'use client';

import React from 'react';
import type { BahiScore, Language } from '@/types';
import { t } from '@/lib/i18n/translations';

interface Props {
  score: BahiScore;
  language: Language;
}

const RISK_COLORS: Record<string, string> = {
  low: 'var(--color-green)',
  medium: 'var(--color-amber)',
  high: 'var(--color-red)',
  building: 'var(--color-bahi)',
};

export default function BahiScoreCard({ score, language }: Props) {
  const riskKey = `risk_${score.riskCategory}` as Parameters<typeof t>[1];
  const riskLabel = t(language, riskKey);
  const riskColor = RISK_COLORS[score.riskCategory] || 'var(--color-bahi)';

  return (
    <div className="score-card animate-fade-in" role="region" aria-label="Bahi Score">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="score-range-label" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {t(language, 'bahiScore')} · {t(language, 'scoreRange')}: 300 – 900
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span
              className="animate-score"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '4rem',
                lineHeight: 1,
                fontWeight: 400,
                color: 'white',
                display: 'block',
              }}
              aria-label={`Bahi score: ${score.total}`}
            >
              {score.total}
            </span>
            <div>
              <div
                className="risk-badge"
                style={{
                  background: riskColor + '22',
                  color: riskColor,
                  border: `1px solid ${riskColor}44`,
                  marginBottom: 4,
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: riskColor, display: 'inline-block' }} />
                {riskLabel}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                {score.historyDays} {t(language, 'days')} · {score.confidence}% {t(language, 'confidence')}
              </p>
            </div>
          </div>
        </div>

        {/* Gauge visualization */}
        <div aria-hidden="true">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
            <circle
              cx="40" cy="40" r="34"
              fill="none"
              stroke={riskColor}
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - (score.total - 300) / 600)}`}
              strokeLinecap="round"
              transform="rotate(-90 40 40)"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
            />
            <text x="40" y="36" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">
              {Math.round(((score.total - 300) / 600) * 100)}%
            </text>
            <text x="40" y="50" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8">
              Rank
            </text>
          </svg>
        </div>
      </div>

      {/* Mini factor summary */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginTop: 'var(--space-4)',
        paddingTop: 'var(--space-4)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        flexWrap: 'wrap',
      }}>
        {score.factors.map((f) => (
          <div key={f.key} style={{ flex: '1 1 80px', minWidth: 70 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                {f.name.split(' ')[0]}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                {f.score}
              </span>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${f.score}%`,
                  height: '100%',
                  background: f.status === 'strong'
                    ? 'var(--color-green-light)'
                    : f.status === 'moderate'
                    ? 'var(--color-amber-light)'
                    : 'var(--color-red-light)',
                  borderRadius: 99,
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

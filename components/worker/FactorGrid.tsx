'use client';

import React from 'react';
import type { BahiScore, Language } from '@/types';
import { t } from '@/lib/i18n/translations';

interface Props {
  score: BahiScore;
  language: Language;
}

export default function FactorGrid({ score, language }: Props) {
  const weakestFactor = [...score.factors].sort((a, b) => a.score - b.score)[0];
  const strongestFactor = [...score.factors].sort((a, b) => b.score - a.score)[0];

  // Calculate potential improvement score
  const potentialScore = Math.min(900, score.total + Math.round((100 - weakestFactor.score) * weakestFactor.weight * 0.6 / 100 * 6));

  return (
    <div>
      {/* Factor Detail Grid */}
      <div className="factor-grid">
        {score.factors.map((f) => (
          <div key={f.key} className="factor-item">
            <div className="factor-row">
              <div className="flex items-center gap-2">
                <div className={`status-dot ${f.status}`} />
                <span className="factor-name">
                  {t(language, `factor_${f.key}` as Parameters<typeof t>[1])}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="factor-weight-tag">{f.weight}%</span>
                <span className="factor-score-label">{f.score}/100</span>
              </div>
            </div>
            <div className="factor-bar-container">
              <div className="factor-bar-track">
                <div
                  className={`factor-bar-fill ${f.status}`}
                  style={{ width: `${f.score}%` }}
                  role="progressbar"
                  aria-valuenow={f.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${f.name} score: ${f.score} out of 100`}
                />
              </div>
            </div>
            <p className="factor-explanation">{f.explanation}</p>
          </div>
        ))}
      </div>

      {/* Why My Score */}
      <div className="card mt-4" style={{ background: 'var(--color-paper-warm)' }}>
        <h3 className="card-title mb-4">{t(language, 'whyMyScore')}</h3>

        <div style={{ display: 'grid', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          <p className="text-xs font-semibold text-muted mb-1" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t(language, 'strengthsTitle')}
          </p>
          {score.factors
            .filter((f) => f.status === 'strong')
            .map((f) => (
              <div key={f.key} className="insight-item positive">
                <span>✓</span>
                <span>{f.explanation}</span>
              </div>
            ))}
          {score.factors.filter((f) => f.status === 'strong').length === 0 && (
            <div className="insight-item neutral">
              <span>ℹ</span>
              <span>Keep building consistent transaction history to strengthen your profile.</span>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          <p className="text-xs font-semibold text-muted mb-1" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t(language, 'improvementsTitle')}
          </p>
          {score.factors
            .filter((f) => f.status === 'weak' || f.status === 'moderate')
            .map((f) => (
              <div key={f.key} className="insight-item" style={{
                background: f.status === 'weak' ? 'var(--color-red-bg)' : 'var(--color-amber-bg)',
                color: f.status === 'weak' ? '#991b1b' : '#92400e'
              }}>
                <span>{f.status === 'weak' ? '↓' : '~'}</span>
                <span>{f.explanation}</span>
              </div>
            ))}
        </div>

        {/* Biggest opportunity */}
        <div style={{
          background: 'white',
          border: '1.5px solid var(--color-bahi)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
        }}>
          <p className="text-xs font-semibold text-bahi mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t(language, 'biggestOpportunity')}
          </p>
          <p style={{ fontWeight: 600, color: 'var(--color-ink)', marginBottom: 'var(--space-2)' }}>
            {weakestFactor.name} ({weakestFactor.score}/100)
          </p>
          <p className="text-sm text-secondary mb-3">{weakestFactor.explanation}</p>

          <div className="flex items-center gap-4">
            <div style={{ textAlign: 'center' }}>
              <p className="text-xs text-muted">{t(language, 'currentScore')}</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-ink-secondary)', fontFamily: 'var(--font-serif)' }}>
                {score.total}
              </p>
            </div>
            <div style={{ fontSize: '1.25rem', color: 'var(--color-green)' }}>→</div>
            <div style={{ textAlign: 'center' }}>
              <p className="text-xs text-muted">{t(language, 'potentialScore')}</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-green)', fontFamily: 'var(--font-serif)' }}>
                {potentialScore}+
              </p>
            </div>
            <div style={{ flex: 1 }}>
              <p className="text-xs text-muted">{t(language, 'couldImprove')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

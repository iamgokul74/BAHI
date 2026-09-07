'use client';

import React from 'react';
import type { Persona, Language } from '@/types';
import { t } from '@/lib/i18n/translations';

interface Props {
  persona: Persona;
  language: Language;
}

export default function InsightsPanel({ persona, language }: Props) {
  const insightTypes: Array<'positive' | 'negative' | 'neutral' | 'warning'> = [
    'positive', 'positive', 'neutral', 'warning', 'neutral'
  ];

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">✨ {t(language, 'myInsights')}</h3>
        <span style={{
          fontSize: '0.7rem',
          background: 'var(--color-bahi-bg)',
          color: 'var(--color-bahi)',
          padding: '2px 8px',
          borderRadius: 'var(--radius-full)',
          fontWeight: 600,
        }}>
          Live Analysis
        </span>
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
        {persona.insights.map((insight, i) => {
          const type = insight.startsWith('⚠️')
            ? 'warning'
            : insight.includes('consistent') || insight.includes('✓') || insight.includes('unlocked')
            ? 'positive'
            : insight.includes('limiting') || insight.includes('low') || insight.includes('Low')
            ? 'negative'
            : 'neutral';

          return (
            <div key={i} className={`insight-item ${type}`}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>
                {type === 'positive' ? '✓' :
                 type === 'warning'  ? '⚠️' :
                 type === 'negative' ? '↓' : 'ℹ'}
              </span>
              <span>{insight}</span>
            </div>
          );
        })}
      </div>

      {/* Improvement Tips */}
      {persona.decision.improvements.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-muted mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t(language, 'howToImprove')}
          </p>
          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            {persona.decision.improvements.map((imp, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-2)',
                padding: 'var(--space-3)',
                background: 'var(--color-paper-warm)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-light)',
                fontSize: '0.875rem',
                color: 'var(--color-ink-secondary)',
              }}>
                <span style={{ color: 'var(--color-bahi)', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                <span>{imp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import type { BahiScore } from '@/types';
import { useApp } from '@/lib/context/AppContext';
import { getDictionary } from '@/lib/i18n/translations';
import { ChevronDown, HelpCircle, Shield, TrendingUp, Calendar, Wallet } from 'lucide-react';

interface Props {
  score: BahiScore;
  personaName: string;
}

export default function BahiWhyScore({ score, personaName }: Props) {
  const { language } = useApp();
  const dict = getDictionary(language);
  const [expandedKey, setExpandedKey] = useState<string | null>('consistency');

  const factorIcons: Record<string, React.ReactNode> = {
    consistency: <Calendar size={18} />,
    recentActivity: <TrendingUp size={18} />,
    incomeTrend: <TrendingUp size={18} />,
    cashBuffer: <Wallet size={18} />,
    integrity: <Shield size={18} />,
  };

  const factorKeyToLabel: Record<string, string> = {
    consistency: dict.factor_consistency,
    recentActivity: dict.factor_recentActivity,
    incomeTrend: dict.factor_incomeTrend,
    cashBuffer: dict.factor_cashBuffer,
    integrity: dict.factor_integrity,
  };

  const detailedInsights: Record<string, { summary: string; actionable: string; formula: string }> = {
    consistency: {
      summary: 'Evaluates how regularly earnings hit the account across weekdays and weeks.',
      actionable: 'Maintaining at least 5 active earning days per week minimizes volatility penalties.',
      formula: 'Active Earning Days Rate (60%) + Weekly Volatility Stability Coefficient (40%)',
    },
    recentActivity: {
      summary: 'Measures earning density and income volume in the most recent 14-day trailing window.',
      actionable: 'Continuous recent trips indicate uninterrupted operational status to lenders.',
      formula: '14-Day Active Days Ratio (60%) + Recent Daily Average vs Historical Baseline (40%)',
    },
    incomeTrend: {
      summary: 'Determines whether weekly earnings are expanding, stable, or declining.',
      actionable: 'Sustaining positive net operating margins signals strong loan repayment capacity.',
      formula: 'Positive Cash-Flow Days (50%) + Expense Margin (30%) + Trend Stability (20%)',
    },
    cashBuffer: {
      summary: 'Calculates average end-of-day account balance relative to monthly operating income.',
      actionable: 'A healthy cash cushion buffers unexpected expenses without triggering defaults.',
      formula: 'Average Balance / Monthly Operating Need (Target: 0.5+ Months Operating Reserve)',
    },
    integrity: {
      summary: 'Anomaly engine checking for organic variation vs synthetic or robotic transaction loops.',
      actionable: 'Natural gig income fluctuation is healthy; identical repeated round sums are flagged.',
      formula: 'Pattern Organic Variance - Anomaly Deductions + Repayment Track Record',
    },
  };

  return (
    <section className="bahi-why-score-section">
      <div className="section-header-left">
        <div className="section-eyebrow">
          <HelpCircle size={14} /> {dict.whyScoreEyebrow}
        </div>
        <h2 className="section-title">
          {dict.whyScoreTitlePrefix} {personaName} {dict.whyScoreTitleSuffix}
        </h2>
        <p className="section-subtitle">
          {dict.whyScoreSubtitle}
        </p>
      </div>

      <div className="why-score-accordion-grid">
        {score.factors.map((factor) => {
          const isExpanded = expandedKey === factor.key;
          const info = detailedInsights[factor.key] || {
            summary: factor.explanation,
            actionable: 'Maintain regular activity.',
            formula: 'Factor composite calculation',
          };
          const localizedName = factorKeyToLabel[factor.key] || factor.name;

          return (
            <div
              key={factor.key}
              className={`why-score-card ${isExpanded ? 'expanded' : ''} ${factor.status}`}
            >
              <button
                className="why-score-card-header"
                onClick={() => setExpandedKey(isExpanded ? null : factor.key)}
                aria-expanded={isExpanded}
              >
                <div className="why-header-left">
                  <div className={`why-icon-badge ${factor.status}`}>
                    {factorIcons[factor.key] || <Shield size={18} />}
                  </div>
                  <div>
                    <div className="why-factor-title-row">
                      <h4 className="why-factor-name">{localizedName}</h4>
                      <span className="why-weight-tag">{factor.weight}%</span>
                    </div>
                    <p className="why-explanation-preview">{factor.explanation}</p>
                  </div>
                </div>

                <div className="why-header-right">
                  <div className="why-score-badge">
                    <span className="score-num">{factor.score}</span>
                    <span className="score-den">/100</span>
                  </div>
                  <ChevronDown size={18} className={`chevron-icon ${isExpanded ? 'rotated' : ''}`} />
                </div>
              </button>

              {isExpanded && (
                <div className="why-score-card-body animate-fade-in">
                  <div className="why-insight-grid">
                    <div className="why-insight-item">
                      <span className="insight-label">{dict.behavioralFinding}</span>
                      <p className="insight-text">{info.summary}</p>
                    </div>

                    <div className="why-insight-item">
                      <span className="insight-label">{dict.underwriterFormula}</span>
                      <p className="insight-code">{info.formula}</p>
                    </div>

                    <div className="why-insight-item highlight">
                      <span className="insight-label">{dict.howToImprove}</span>
                      <p className="insight-text">{info.actionable}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

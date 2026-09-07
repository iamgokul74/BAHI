'use client';

import React, { useEffect, useState } from 'react';
import type { BahiScore } from '@/types';
import { useApp } from '@/lib/context/AppContext';
import { getDictionary } from '@/lib/i18n/translations';
import { Sparkles } from 'lucide-react';

interface Props {
  score: BahiScore;
  personaName: string;
  historyDays: number;
  isColdStart: boolean;
}

export default function BahiScoreHero({ score, personaName, historyDays, isColdStart }: Props) {
  const { language } = useApp();
  const dict = getDictionary(language);
  const [displayScore, setDisplayScore] = useState(300);

  useEffect(() => {
    let start = 300;
    const target = score.total;
    const duration = 650;
    const steps = 30;
    const stepTime = duration / steps;
    const increment = (target - start) / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayScore(target);
        clearInterval(timer);
      } else {
        start += increment;
        setDisplayScore(Math.round(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [score.total]);

  // Compute ring stroke
  const minScore = 300;
  const maxScore = 900;
  const percentage = Math.max(0, Math.min(100, ((score.total - minScore) / (maxScore - minScore)) * 100));
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const isLowRisk = score.total >= 680;
  const isFair = score.total >= 540 && score.total < 680;

  const ringColor = isLowRisk ? '#16a34a' : isFair ? '#d97706' : '#dc2626';

  const factorKeyToLabel: Record<string, string> = {
    consistency: dict.factor_consistency,
    recentActivity: dict.factor_recentActivity,
    incomeTrend: dict.factor_incomeTrend,
    cashBuffer: dict.factor_cashBuffer,
    integrity: dict.factor_integrity,
  };

  return (
    <div className="bahi-score-hero-container">
      <div className="score-hero-header">
        <div>
          <div className="score-eyebrow">
            <Sparkles size={13} style={{ color: 'var(--gold)' }} />
            <span>{dict.scoreEyebrow}</span>
          </div>
          <h2 className="score-heading">{personaName}{dict.scoreHeadingSuffix}</h2>
          <p className="score-subtext">
            {dict.scoreCalculatedFrom} {historyDays} {dict.scoreDaysOfActivity}
          </p>
        </div>

        <div className="score-badge-container">
          <span className={`score-status-badge ${score.riskCategory}`}>
            {isColdStart ? dict.statusBuilding : isLowRisk ? dict.statusLowRisk : dict.statusMediumRisk}
          </span>
        </div>
      </div>

      <div className="score-hero-grid">
        {/* Circular Gauge Ring */}
        <div className="score-gauge-card">
          <div className="score-ring-wrapper">
            <svg className="score-svg" viewBox="0 0 220 220" width="220" height="220">
              <circle
                className="score-ring-bg"
                cx="110"
                cy="110"
                r={radius}
                strokeWidth="16"
                fill="none"
              />
              <circle
                className="score-ring-fill"
                cx="110"
                cy="110"
                r={radius}
                strokeWidth="16"
                stroke={ringColor}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                transform="rotate(-90 110 110)"
              />
            </svg>

            <div className="score-ring-center">
              <span className="score-scale-label">{dict.scaleLabel}</span>
              <span className="score-center-number">{displayScore}</span>
              <span className="score-scale-range">{dict.scaleRange}</span>
            </div>
          </div>

          <div className="score-meta-pills">
            <div className="meta-pill">
              <span className="pill-title">{dict.confidenceLabel}</span>
              <span className="pill-val">{score.confidence}%</span>
            </div>
            <div className="meta-pill">
              <span className="pill-title">{dict.historyLabel}</span>
              <span className="pill-val">{historyDays}d</span>
            </div>
            <div className="meta-pill">
              <span className="pill-title">{dict.riskTierLabel}</span>
              <span className="pill-val" style={{ textTransform: 'capitalize' }}>
                {score.riskCategory === 'low' ? 'Low' : score.riskCategory === 'building' ? 'Building' : 'Medium'}
              </span>
            </div>
          </div>
        </div>

        {/* Five Factor Progress Bars */}
        <div className="score-factors-card">
          <div className="factors-card-header">
            <h3 className="factors-title">{dict.fiveFactorTitle}</h3>
            <span className="factors-subtitle">{dict.weightsSumNotice}</span>
          </div>

          <div className="factors-progress-list">
            {score.factors.map((factor) => {
              const statusColor =
                factor.score >= 70 ? 'var(--color-green)' : factor.score >= 45 ? 'var(--color-amber)' : 'var(--color-red)';
              const localizedName = factorKeyToLabel[factor.key] || factor.name;

              return (
                <div key={factor.key} className="factor-row">
                  <div className="factor-row-top">
                    <div className="factor-name-box">
                      <span className="factor-dot" style={{ backgroundColor: statusColor }} />
                      <span className="factor-name">{localizedName}</span>
                      <span className="factor-weight-tag">{factor.weight}%</span>
                    </div>
                    <span className="factor-score-val" style={{ color: statusColor }}>
                      {factor.score} / 100
                    </span>
                  </div>

                  <div className="factor-bar-track">
                    <div
                      className="factor-bar-fill"
                      style={{
                        width: `${factor.score}%`,
                        backgroundColor: statusColor,
                      }}
                    />
                  </div>

                  <p className="factor-explanation-snip">{factor.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

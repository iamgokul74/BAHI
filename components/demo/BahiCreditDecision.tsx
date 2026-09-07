'use client';

import React from 'react';
import type { CreditDecision } from '@/types';
import { useApp } from '@/lib/context/AppContext';
import { getDictionary } from '@/lib/i18n/translations';
import { CheckCircle2, Zap, Target } from 'lucide-react';

interface Props {
  decision: CreditDecision;
  personaName: string;
  isColdStart: boolean;
  historyDays: number;
}

export default function BahiCreditDecision({ decision, personaName, isColdStart, historyDays }: Props) {
  const { language } = useApp();
  const dict = getDictionary(language);

  const isApproved = decision.type === 'approve';
  const isStarter = decision.type === 'starter_advance';
  const isReview = decision.type === 'review';

  return (
    <section className="bahi-credit-decision-section">
      <div className="section-header-left">
        <div className="section-eyebrow">
          <Zap size={14} /> {dict.decisionEyebrow}
        </div>
        <h2 className="section-title">{dict.decisionTitle}</h2>
        <p className="section-subtitle">
          {dict.decisionSubtitlePrefix} {personaName}{dict.decisionSubtitleSuffix}
        </p>
      </div>

      <div className="credit-decision-container-card">
        {/* Decision Top Banner */}
        <div className={`decision-banner ${decision.type}`}>
          <div className="decision-banner-left">
            <span className="decision-status-tag">
              {isApproved ? dict.approvedTag : isStarter ? dict.starterTag : dict.reviewTag}
            </span>
            <h3 className="decision-main-title">
              {isApproved
                ? `${dict.eligibleWorkingCapital} ₹${decision.recommendedLimit.toLocaleString('en-IN')} ${dict.workingCapitalSuffix}`
                : isStarter
                ? `${dict.eligibleStarter} ₹${decision.recommendedLimit.toLocaleString('en-IN')} ${dict.starterAdvanceSuffix}`
                : 'Account Scheduled for Underwriter Review'}
            </h3>
          </div>

          <div className="decision-banner-right">
            <div className="repay-confidence-box">
              <span className="conf-label">{dict.repayConfidence}</span>
              <span className="conf-value">{decision.repaymentConfidence}%</span>
              <div className="conf-bar-track">
                <div className="conf-bar-fill" style={{ width: `${decision.repaymentConfidence}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* 3 Core Decision Parameters */}
        <div className="decision-params-grid">
          <div className="decision-param-item">
            <span className="param-label">{dict.recLimit}</span>
            <p className="param-value inr-amount">₹{decision.recommendedLimit.toLocaleString('en-IN')}</p>
            <span className="param-note">{dict.instantDisbursal}</span>
          </div>

          <div className="decision-param-item">
            <span className="param-label">{dict.maxExtendedLimit}</span>
            <p className="param-value inr-amount">₹{decision.maxLimit.toLocaleString('en-IN')}</p>
            <span className="param-note">{dict.unlockedOnTime}</span>
          </div>

          <div className="decision-param-item">
            <span className="param-label">{dict.repayTenure}</span>
            <p className="param-value">{decision.repaymentDays} Days</p>
            <span className="param-note">{dict.flexibleAutoPay}</span>
          </div>
        </div>

        {/* Rationale and Improvements Grid */}
        <div className="decision-reasons-grid">
          <div className="reasons-column">
            <h4 className="column-heading">
              <CheckCircle2 size={16} className="text-green" /> {dict.underwritingRationale}
            </h4>
            <div className="reasons-list">
              {decision.reasons.map((r, i) => (
                <div key={i} className="reason-item positive">
                  <span className="reason-bullet">✓</span>
                  <span className="reason-text">{r}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="reasons-column">
            <h4 className="column-heading">
              <Target size={16} className="text-amber" /> {dict.pathToExpansion}
            </h4>
            <div className="reasons-list">
              {decision.improvements.map((imp, i) => (
                <div key={i} className="reason-item neutral">
                  <span className="reason-bullet">→</span>
                  <span className="reason-text">{imp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

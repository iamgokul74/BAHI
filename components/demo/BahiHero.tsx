'use client';

import React from 'react';
import { useApp } from '@/lib/context/AppContext';
import { getDictionary } from '@/lib/i18n/translations';
import { Sparkles } from 'lucide-react';

interface Props {
  selectedProfileId: 'new_rider' | 'cab_driver';
  onSelectProfile: (id: 'new_rider' | 'cab_driver') => void;
  isAnalyzing: boolean;
}

export default function BahiHero({ selectedProfileId, onSelectProfile, isAnalyzing }: Props) {
  const { language } = useApp();
  const dict = getDictionary(language);

  return (
    <section className="bahi-hero-section">
      <div className="bahi-hero-bg-grid" />
      <div className="bahi-hero-glow-blob blob-left" />
      <div className="bahi-hero-glow-blob blob-right" />

      <div className="bahi-hero-content">
        {/* Tagline Pill */}
        <div className="bahi-pill-badge">
          <Sparkles size={14} className="bahi-pill-icon" />
          <span>{dict.explainableBadge}</span>
        </div>

        {/* Main Headline */}
        <h1 className="bahi-hero-title">
          {dict.heroTitlePrefix} <span className="text-gradient-bahi">{dict.heroTitleGradient}</span> {dict.heroTitleSuffix}
        </h1>

        <p className="bahi-hero-subtitle">
          {dict.heroSubtitle}
        </p>

        {/* Traditional vs BAHI Philosophy Comparison */}
        <div className="bahi-philosophy-grid">
          <div className="bahi-philosophy-card traditional">
            <div className="philosophy-header">
              <span className="philosophy-tag tag-muted">{dict.tradBureau}</span>
              <span className="philosophy-icon">✕</span>
            </div>
            <p className="philosophy-question">{dict.tradQuestion}</p>
            <p className="philosophy-sub">
              {dict.tradSub}
            </p>
          </div>

          <div className="bahi-philosophy-card bahi-native">
            <div className="philosophy-header">
              <span className="philosophy-tag tag-bahi">{dict.bahiNative}</span>
              <span className="philosophy-icon check">✓</span>
            </div>
            <p className="philosophy-question">{dict.bahiQuestion}</p>
            <p className="philosophy-sub">
              {dict.bahiSub}
            </p>
          </div>
        </div>

        {/* Flow Visualization */}
        <div className="bahi-flow-strip">
          <div className="flow-step">
            <span className="flow-icon">💳</span>
            <span className="flow-text">{dict.flowStep1}</span>
          </div>
          <span className="flow-arrow">→</span>
          <div className="flow-step">
            <span className="flow-icon">📊</span>
            <span className="flow-text">{dict.flowStep2}</span>
          </div>
          <span className="flow-arrow">→</span>
          <div className="flow-step">
            <span className="flow-icon">🧠</span>
            <span className="flow-text">{dict.flowStep3}</span>
          </div>
          <span className="flow-arrow">→</span>
          <div className="flow-step highlight">
            <span className="flow-icon">🎯</span>
            <span className="flow-text">{dict.flowStep4}</span>
          </div>
          <span className="flow-arrow">→</span>
          <div className="flow-step">
            <span className="flow-icon">⚡</span>
            <span className="flow-text">{dict.flowStep5}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

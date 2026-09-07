'use client';

import React from 'react';
import { useApp } from '@/lib/context/AppContext';
import { getDictionary } from '@/lib/i18n/translations';
import { Clock, TrendingUp, Sparkles, CheckCircle2 } from 'lucide-react';

interface Props {
  selectedId: 'new_rider' | 'cab_driver';
  onSelect: (id: 'new_rider' | 'cab_driver') => void;
  isAnalyzing: boolean;
  priyaScore?: number;
  raviScore?: number;
}

export default function BahiProfileSelector({ 
  selectedId, 
  onSelect, 
  isAnalyzing,
  priyaScore = 700,
  raviScore = 678,
}: Props) {
  const { language } = useApp();
  const dict = getDictionary(language);

  const profiles = [
    {
      id: 'new_rider' as const,
      name: 'Priya Sharma',
      avatar: '🛵',
      occupation: dict.priyaOccupation,
      city: dict.priyaCity,
      age: 24,
      historyDays: 14,
      statusLabel: dict.priyaStatus,
      statusType: 'building',
      score: priyaScore,
      summary: dict.priyaSummary,
      highlight: dict.priyaHighlight,
    },
    {
      id: 'cab_driver' as const,
      name: 'Ravi Kumar',
      avatar: '🚕',
      occupation: dict.raviOccupation,
      city: dict.raviCity,
      age: 32,
      historyDays: 90,
      statusLabel: dict.raviStatus,
      statusType: 'low',
      score: raviScore,
      summary: dict.raviSummary,
      highlight: dict.raviHighlight,
    },
  ];

  return (
    <section className="bahi-profile-selector-section" id="profiles">
      <div className="section-header-centered">
        <div className="section-eyebrow">
          <Sparkles size={14} /> {dict.exploreProfilesEyebrow}
        </div>
        <h2 className="section-title">{dict.exploreProfilesTitle}</h2>
        <p className="section-subtitle">
          {dict.exploreProfilesSubtitle}
        </p>
      </div>

      <div className="bahi-profile-grid">
        {profiles.map((p) => {
          const isSelected = selectedId === p.id;

          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`bahi-profile-card ${isSelected ? 'active' : ''}`}
              aria-pressed={isSelected}
            >
              {isSelected && (
                <div className="profile-active-pill">
                  <CheckCircle2 size={13} /> {dict.activeUnderAnalysis}
                </div>
              )}

              <div className="profile-card-top">
                <div className="profile-avatar-box">
                  <span className="profile-avatar-emoji">{p.avatar}</span>
                </div>
                <div className="profile-identity">
                  <h3 className="profile-name">{p.name}</h3>
                  <p className="profile-meta">{p.occupation} · {p.city}</p>
                </div>
                <div className="profile-score-tag">
                  <span className="score-tag-num">{p.score}</span>
                  <span className="score-tag-label">{dict.scoreTagLabel}</span>
                </div>
              </div>

              <div className="profile-card-badge-row">
                <span className={`status-pill ${p.statusType}`}>
                  ● {p.statusLabel}
                </span>
                <span className="history-pill">
                  <Clock size={12} /> {p.historyDays} {dict.daysHistory}
                </span>
              </div>

              <p className="profile-summary">{p.summary}</p>

              <div className="profile-highlight-box">
                <TrendingUp size={14} className="highlight-icon" />
                <span>{p.highlight}</span>
              </div>

              <div className="profile-card-footer">
                <span className="inspect-cta">
                  {isSelected ? dict.viewingAnalysisCta : dict.inspectAnalysisCta}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

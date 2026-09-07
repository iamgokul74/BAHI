'use client';

import React from 'react';

interface Props {
  isAnalyzing?: boolean;
  score?: number;
}

export default function BahiAIOrb({ isAnalyzing = false, score }: Props) {
  return (
    <div className="bahi-orb-container" aria-hidden="true">
      <div className={`bahi-orb ${isAnalyzing ? 'analyzing' : ''}`}>
        <div className="bahi-orb-glow" />
        <div className="bahi-orb-inner">
          <div className="bahi-orb-core" />
          <div className="bahi-orb-ring ring-1" />
          <div className="bahi-orb-ring ring-2" />
          <div className="bahi-orb-ring ring-3" />
        </div>
      </div>
      <div className="bahi-orb-label">
        <span className="bahi-orb-dot" />
        <span>{isAnalyzing ? 'Analyzing Cash Flow...' : 'BAHI Intelligence Core Active'}</span>
      </div>
    </div>
  );
}

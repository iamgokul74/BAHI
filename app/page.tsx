'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/context/AppContext';
import BahiHero from '@/components/demo/BahiHero';
import BahiProfileSelector from '@/components/demo/BahiProfileSelector';
import BahiScoreHero from '@/components/demo/BahiScoreHero';
import BahiWhyScore from '@/components/demo/BahiWhyScore';
import BahiCashFlow from '@/components/demo/BahiCashFlow';
import BahiTransactionTimeline from '@/components/demo/BahiTransactionTimeline';
import BahiCreditDecision from '@/components/demo/BahiCreditDecision';
import BahiCreditJourney from '@/components/demo/BahiCreditJourney';
import BahiAskAI from '@/components/demo/BahiAskAI';
import { CsvUploader } from '@/components/worker/CsvUploader';
import { UploadCloud, Sparkles, Shield, ArrowDown } from 'lucide-react';

export default function HomePage() {
  const { personas, selectedPersonaId, setPersona, refreshData } = useApp();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCsvDrawer, setShowCsvDrawer] = useState(false);

  // We explicitly highlight the 2 main demo personas
  const activeProfileKey = (selectedPersonaId === 'new_rider' ? 'new_rider' : 'cab_driver') as 'new_rider' | 'cab_driver';

  const handleProfileSelect = (id: 'new_rider' | 'cab_driver') => {
    setIsAnalyzing(true);
    setPersona(id);
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 400);
  };

  const activePersona = useMemo(() => {
    return personas.find((p) => p.id === activeProfileKey) || personas[0];
  }, [personas, activeProfileKey]);

  return (
    <div className="bahi-page-wrapper">
      {/* 1. Hero Section & Philosophy Comparison */}
      <BahiHero
        selectedProfileId={activeProfileKey}
        onSelectProfile={handleProfileSelect}
        isAnalyzing={isAnalyzing}
      />

      <div className="container" style={{ paddingBottom: 'var(--space-16)' }}>
        {/* 2. Two Demo Profile Selector */}
        <BahiProfileSelector
          selectedId={activeProfileKey}
          onSelect={handleProfileSelect}
          isAnalyzing={isAnalyzing}
          priyaScore={personas.find((p) => p.id === 'new_rider')?.score.total || 700}
          raviScore={personas.find((p) => p.id === 'cab_driver')?.score.total || 678}
        />

        {/* Optional CSV Statement Uploader Toggle */}
        <div className="bahi-uploader-toggle-bar">
          <button
            onClick={() => setShowCsvDrawer(!showCsvDrawer)}
            className="btn-uploader-toggle"
          >
            <UploadCloud size={16} />
            <span>{showCsvDrawer ? 'Hide CSV Statement Ingest' : 'Want to test custom data? Upload Statement CSV'}</span>
          </button>
        </div>

        {showCsvDrawer && (
          <div className="animate-fade-in" style={{ marginBottom: '32px' }}>
            <CsvUploader onUploadSuccess={() => refreshData()} />
          </div>
        )}

        {/* Dynamic Transition Wrapper */}
        <div className={`bahi-analysis-content ${isAnalyzing ? 'transitioning' : 'active'}`}>
          {/* 3. BAHI Score Centerpiece */}
          <BahiScoreHero
            score={activePersona.score}
            personaName={activePersona.name}
            historyDays={activePersona.score.historyDays}
            isColdStart={activePersona.coldStart || false}
          />

          {/* 4. Why This Score? Expandable Explainability Cards */}
          <BahiWhyScore
            score={activePersona.score}
            personaName={activePersona.name}
          />

          {/* 5. Cash-Flow Intelligence & Analytics Charts */}
          <BahiCashFlow
            transactions={activePersona.transactions}
            personaName={activePersona.name}
            historyDays={activePersona.score.historyDays}
          />

          {/* 6. Financial Activity Ledger / Transaction Timeline */}
          <BahiTransactionTimeline
            transactions={activePersona.transactions}
            personaName={activePersona.name}
          />

          {/* 7. Credit Intelligence & Decision Engine */}
          <BahiCreditDecision
            decision={activePersona.decision}
            personaName={activePersona.name}
            isColdStart={activePersona.coldStart || false}
            historyDays={activePersona.score.historyDays}
          />

          {/* 8. What Can I Do Next? & Credit Journey */}
          <BahiCreditJourney
            personaId={activeProfileKey}
            personaName={activePersona.name}
            scoreVal={activePersona.score.total}
            historyDays={activePersona.score.historyDays}
            limit={activePersona.decision.recommendedLimit}
          />

          {/* 9. AI-Native Ask BAHI Copilot */}
          <BahiAskAI
            persona={activePersona}
          />
        </div>
      </div>
    </div>
  );
}

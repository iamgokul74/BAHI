'use client';

import React from 'react';
import { useApp } from '@/lib/context/AppContext';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Activity, Landmark, Sparkles } from 'lucide-react';

export default function Navbar() {
  const { view, setView, language, setLanguage } = useApp();
  const router = useRouter();

  function handleViewChange(v: 'worker' | 'lender') {
    setView(v);
    router.push(v === 'worker' ? '/' : '/lender');
  }

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="container navbar-inner">
        {/* Brand */}
        <a className="navbar-brand" href="/" aria-label="BAHI Home">
          <div className="navbar-logo-wrap">
            <span className="navbar-logo">BAHI</span>
            <span className="navbar-sparkle">✦</span>
          </div>
          <span className="navbar-tagline">Cash-Flow Credit Intelligence</span>
        </a>

        {/* Live Status Badge */}
        <div className="status-live-pill hide-mobile" title="Cash-Flow Behavioral Engine Active">
          <span className="pulse-green-dot" />
          <span>Intelligence Engine Live</span>
        </div>

        {/* Actions */}
        <div className="navbar-actions">
          {/* View Toggle */}
          <div className="view-toggle" role="group" aria-label="Switch view">
            <button
              id="view-worker-btn"
              className={`view-toggle-btn${view === 'worker' ? ' active' : ''}`}
              onClick={() => handleViewChange('worker')}
              aria-pressed={view === 'worker'}
            >
              Borrower View
            </button>
            <button
              id="view-lender-btn"
              className={`view-toggle-btn${view === 'lender' ? ' active' : ''}`}
              onClick={() => handleViewChange('lender')}
              aria-pressed={view === 'lender'}
            >
              Lender Command Center
            </button>
          </div>

          {/* Language Toggle */}
          <div className="lang-toggle" role="group" aria-label="Select language">
            {(['en', 'hi', 'ta'] as const).map((lang) => (
              <button
                key={lang}
                id={`lang-${lang}-btn`}
                className={`lang-btn${language === lang ? ' active' : ''}`}
                onClick={() => setLanguage(lang)}
                aria-pressed={language === lang}
                aria-label={lang === 'en' ? 'English' : lang === 'hi' ? 'Hindi' : 'Tamil'}
              >
                {lang === 'en' ? 'EN' : lang === 'hi' ? 'हि' : 'த'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

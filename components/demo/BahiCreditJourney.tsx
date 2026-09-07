'use client';

import React from 'react';
import { useApp } from '@/lib/context/AppContext';
import { getDictionary } from '@/lib/i18n/translations';
import { Compass, Award } from 'lucide-react';

interface Props {
  personaId: 'new_rider' | 'cab_driver';
  personaName: string;
  scoreVal: number;
  historyDays: number;
  limit: number;
}

export default function BahiCreditJourney({ personaId, personaName, scoreVal, historyDays, limit }: Props) {
  const { language } = useApp();
  const dict = getDictionary(language);
  const isPriya = personaId === 'new_rider';

  return (
    <section className="bahi-journey-section">
      {/* Personalized Next Step Card */}
      <div className="bahi-next-steps-card">
        <div className="next-steps-header">
          <div className="next-steps-tag">
            <Compass size={14} /> {dict.nextStepsEyebrow}
          </div>
          <h3 className="next-steps-title">
            {isPriya
              ? `${personaName} ${dict.priyaBuildingHeading}`
              : `${personaName}${dict.raviPrimeHeading}`}
          </h3>
        </div>

        <div className="next-steps-content-grid">
          {isPriya ? (
            <>
              <div className="next-step-box active">
                <div className="step-num">1</div>
                <div>
                  <h4 className="step-title">Take Starter Micro-Advance</h4>
                  <p className="step-desc">
                    Access ₹{limit.toLocaleString('en-IN')} for fuel and maintenance with zero paperwork.
                  </p>
                </div>
              </div>

              <div className="next-step-box">
                <div className="step-num">2</div>
                <div>
                  <h4 className="step-title">Complete 21 Days of Driving</h4>
                  <p className="step-desc">
                    7 more days of active trip earnings will graduate Priya to the full prime credit tier.
                  </p>
                </div>
              </div>

              <div className="next-step-box">
                <div className="step-num">3</div>
                <div>
                  <h4 className="step-title">Unlock ₹10,000+ Credit Line</h4>
                  <p className="step-desc">
                    On-time repayment of starter advances automatically adds +15 to +35 points to the Bahi Score.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="next-step-box active">
                <div className="step-num">1</div>
                <div>
                  <h4 className="step-title">Deploy Working Capital</h4>
                  <p className="step-desc">
                    Draw up to ₹{limit.toLocaleString('en-IN')} at low institutional rates (3% flat).
                  </p>
                </div>
              </div>

              <div className="next-step-box">
                <div className="step-num">2</div>
                <div>
                  <h4 className="step-title">Maintain Weekend Surge Buffers</h4>
                  <p className="step-desc">
                    Ravi&apos;s weekend earnings maintain a ₹3,500+ buffer, keeping his score in the prime 780+ range.
                  </p>
                </div>
              </div>

              <div className="next-step-box">
                <div className="step-num">3</div>
                <div>
                  <h4 className="step-title">Expand to Vehicle Upgrade Loan</h4>
                  <p className="step-desc">
                    Consistent performance unlocks institutional asset-financing partnerships.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Credit Journey Lifecycle Timeline */}
      <div className="bahi-lifecycle-container">
        <div className="lifecycle-header">
          <Award size={16} className="text-gold" />
          <h4 className="lifecycle-title">{dict.lifecycleTitle}</h4>
        </div>

        <div className="lifecycle-steps-row">
          <div className="lifecycle-step-card done">
            <span className="step-circle">1</span>
            <span className="step-phase">{dict.phase1}</span>
            <p className="step-sub">{dict.phase1Sub}</p>
          </div>

          <span className="lifecycle-divider" />

          <div className="lifecycle-step-card done">
            <span className="step-circle">2</span>
            <span className="step-phase">{dict.phase2}</span>
            <p className="step-sub">{dict.phase2Sub}</p>
          </div>

          <span className="lifecycle-divider" />

          <div className="lifecycle-step-card current">
            <span className="step-circle">3</span>
            <span className="step-phase">{dict.phase3}</span>
            <p className="step-sub">{scoreVal} / 900 {dict.phase3Sub}</p>
          </div>

          <span className="lifecycle-divider" />

          <div className="lifecycle-step-card">
            <span className="step-circle">4</span>
            <span className="step-phase">{dict.phase4}</span>
            <p className="step-sub">₹{limit.toLocaleString('en-IN')} {dict.phase4Sub}</p>
          </div>

          <span className="lifecycle-divider" />

          <div className="lifecycle-step-card">
            <span className="step-circle">5</span>
            <span className="step-phase">{dict.phase5}</span>
            <p className="step-sub">{dict.phase5Sub}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

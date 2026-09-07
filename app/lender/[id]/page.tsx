'use client';

import React, { useState, useEffect, use } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { t } from '@/lib/i18n/translations';
import { useRouter } from 'next/navigation';
import { DailyIncomeChart, CashBufferChart, ScoreEvolutionChart } from '@/components/charts/Charts';
import { generateScoreEvolution } from '@/lib/scoring/engine';
import { Shield, CheckCircle2, XCircle, AlertTriangle, RefreshCw, ArrowLeft, Landmark } from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
}

export default function ApplicantDetailPage({ params }: Props) {
  const { id } = use(params);
  const { personas, language, refreshData } = useApp();
  const router = useRouter();

  const [applicantData, setApplicantData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [underwritingNotes, setUnderwritingNotes] = useState('');
  const [customLimit, setCustomLimit] = useState<number>(5000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decisionFeedback, setDecisionFeedback] = useState<string | null>(null);

  // Fallback persona
  const fallbackPersona = personas.find((p) => p.id === id);

  const fetchApplicantDetails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/lender/applicants/${id}`);
      if (res.ok) {
        const data = await res.json();
        setApplicantData(data.applicant);
        if (data.applicant?.profile?.starterEligibility) {
          setCustomLimit(data.applicant.profile.starterEligibility);
        }
      }
    } catch (err) {
      console.error('Failed to load applicant detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicantDetails();
  }, [id]);

  const handleDecision = async (decision: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW') => {
    setIsSubmitting(true);
    setDecisionFeedback(null);
    try {
      const appId = applicantData?.applications?.[0]?.id;
      if (!appId) {
        // Create an application on the fly if needed for demo
        const appRes = await fetch('/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestedAmount: customLimit,
            purpose: 'Lender pre-approved credit line',
            tenureWeeks: 4,
          }),
        });
        const appData = await appRes.json();
        if (appData.application) {
          const decRes = await fetch('/api/lender/decision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              applicationId: appData.application.id,
              decision,
              notes: underwritingNotes || `Underwriting action by institutional lender: ${decision}`,
              customLimit,
            }),
          });
          const decData = await decRes.json();
          setDecisionFeedback(`Decision recorded: ${decision}. Loan disbursed: ${decData.loan ? 'YES' : 'NO'}`);
          await fetchApplicantDetails();
          await refreshData();
          return;
        }
      }

      const res = await fetch('/api/lender/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: appId,
          decision,
          notes: underwritingNotes || `Decision submitted: ${decision}`,
          customLimit,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit decision');

      setDecisionFeedback(`Decision saved: Application marked as ${decision}!`);
      await fetchApplicantDetails();
      await refreshData();
    } catch (err: any) {
      setDecisionFeedback(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build unified dossier
  const name = applicantData?.name || fallbackPersona?.name || 'Applicant';
  const occupation = applicantData?.profile?.occupation || fallbackPersona?.occupation || 'Worker';
  const city = applicantData?.profile?.city || fallbackPersona?.city || 'Bengaluru';
  const scoreVal = applicantData?.latestScore?.score || fallbackPersona?.score.total || 650;
  const historyDays = applicantData?.profile?.profileAgeDays || fallbackPersona?.score.historyDays || 30;
  const riskEvents = applicantData?.riskEvents || (fallbackPersona?.id === 'flagged' ? [{ type: 'REPEATED_AMOUNTS', severity: 'HIGH', description: 'Excessive identical amounts' }] : []);
  const transactions = applicantData?.transactions || fallbackPersona?.transactions || [];
  const scoreEvolution = generateScoreEvolution(transactions);

  return (
    <div className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
      {/* Back */}
      <button
        id="back-to-lender-btn"
        className="btn btn-ghost btn-sm mb-4"
        onClick={() => router.push('/lender')}
        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        <ArrowLeft size={16} /> Back to Institutional Lender Dashboard
      </button>

      {/* Header Banner */}
      <div
        className="card mb-6"
        style={{
          background: 'linear-gradient(135deg, var(--color-ink) 0%, #1e293b 100%)',
          color: 'white',
          padding: '24px 32px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '2.5rem' }}>{fallbackPersona?.avatar || '👤'}</span>
              <div>
                <h1 style={{ color: 'white', margin: 0, fontSize: '1.6rem' }}>{name}</h1>
                <p style={{ color: '#94A3B8', margin: '2px 0 0 0', fontSize: '0.9rem' }}>
                  {occupation} · {city} · {historyDays} Days of Persistent Cash-Flow History
                </p>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#94A3B8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Verified Bahi Score
            </div>
            <div style={{ fontSize: '3.2rem', fontFamily: 'var(--font-serif)', lineHeight: 1, fontWeight: 700, color: '#fff' }}>
              {scoreVal}
            </div>
            <div style={{ marginTop: '6px' }}>
              <span
                style={{
                  padding: '3px 12px',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  backgroundColor: scoreVal >= 700 ? 'rgba(22, 163, 74, 0.25)' : scoreVal >= 550 ? 'rgba(217, 119, 6, 0.25)' : 'rgba(220, 38, 38, 0.25)',
                  color: scoreVal >= 700 ? '#4ade80' : scoreVal >= 550 ? '#fbbf24' : '#f87171',
                  border: '1px solid currentColor',
                }}
              >
                {scoreVal >= 700 ? 'LOW RISK' : scoreVal >= 550 ? 'MODERATE RISK' : 'HIGH RISK'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Feedback Banner */}
      {decisionFeedback && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 18px',
            borderRadius: '8px',
            backgroundColor: '#F0FDF4',
            border: '1px solid #86EFAC',
            color: '#166534',
            fontWeight: 600,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={18} /> {decisionFeedback}
        </div>
      )}

      {/* Underwriting Action Panel */}
      <div className="card mb-6" style={{ border: '2px solid var(--gold)', backgroundColor: '#FFFDF9' }}>
        <div className="card-header" style={{ borderBottom: '1px solid rgba(217, 119, 6, 0.2)', paddingBottom: '12px' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--navy)' }}>
            <Landmark size={20} style={{ color: 'var(--gold)' }} />
            Institutional Underwriting Action & Loan Disbursement
          </h3>
          <span className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>
            Lender Decision Engine Active
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
              Approved Credit Limit (₹)
            </label>
            <input
              type="number"
              step={500}
              value={customLimit}
              onChange={(e) => setCustomLimit(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
              Underwriting Rationale / Lender Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Verified 90-day cash flow, approved for ₹5,000 advance"
              value={underwritingNotes}
              onChange={(e) => setUnderwritingNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
          <button
            disabled={isSubmitting}
            onClick={() => handleDecision('APPROVED')}
            className="btn btn-primary"
            style={{
              flex: 1,
              backgroundColor: '#16A34A',
              borderColor: '#16A34A',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle2 size={16} /> Approve & Disburse Loan
          </button>
          <button
            disabled={isSubmitting}
            onClick={() => handleDecision('UNDER_REVIEW')}
            className="btn btn-outline"
            style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangle size={16} /> Mark Under Review
          </button>
          <button
            disabled={isSubmitting}
            onClick={() => handleDecision('REJECTED')}
            className="btn btn-outline"
            style={{
              flex: 1,
              color: '#DC2626',
              borderColor: '#DC2626',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <XCircle size={16} /> Decline Application
          </button>
        </div>
      </div>

      {/* Anomalies and Risk Events */}
      {riskEvents.length > 0 && (
        <div className="card mb-6" style={{ borderLeft: '4px solid #DC2626', backgroundColor: '#FEF2F2' }}>
          <h3 className="card-title mb-2" style={{ color: '#B91C1C', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={18} /> Detected Behavioral Anomalies ({riskEvents.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {riskEvents.map((r: any, i: number) => (
              <div key={i} style={{ fontSize: '0.85rem', color: '#991B1B' }}>
                <strong>{r.type}:</strong> {r.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid-2 mb-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📊 Daily Income Pattern</h3>
          </div>
          <DailyIncomeChart transactions={transactions} />
        </div>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📈 Score Evolution History</h3>
          </div>
          <ScoreEvolutionChart points={scoreEvolution} />
        </div>
      </div>

      {/* Verified Transactions Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📋 Verified Financial Transactions ({transactions.length})</h3>
          <span className="text-xs text-muted">Showing latest 15</span>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {[...transactions]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 15)
                .map((tx: any, idx: number) => (
                  <tr key={tx.id || idx}>
                    <td className="text-xs">{tx.date}</td>
                    <td style={{ fontWeight: 500 }}>{tx.description}</td>
                    <td>
                      <span className="tag">{tx.category}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: tx.type === 'income' ? '#16A34A' : '#DC2626' }}>
                      {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right' }} className="inr-amount">
                      ₹{tx.balance?.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

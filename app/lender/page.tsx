'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { t } from '@/lib/i18n/translations';
import { useRouter } from 'next/navigation';
import { Search, Filter, ShieldCheck, AlertOctagon, TrendingUp, RefreshCw } from 'lucide-react';

export default function LenderPage() {
  const { personas, language } = useApp();
  const router = useRouter();

  const [liveApplicants, setLiveApplicants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'LOW' | 'MODERATE' | 'HIGH'>('ALL');

  const fetchApplicants = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/lender/applicants?search=${encodeURIComponent(searchTerm)}&risk=${riskFilter}`);
      if (res.ok) {
        const data = await res.json();
        setLiveApplicants(data.applicants);
      }
    } catch (err) {
      console.error('Failed to fetch applicants:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, [searchTerm, riskFilter]);

  // Combine live applicants with fallback personas if database list is still syncing
  const applicantsList = useMemo(() => {
    if (liveApplicants.length > 0) return liveApplicants;

    return personas.map((p) => ({
      id: p.id,
      name: p.name,
      email: `${p.id}@bahi.in`,
      occupation: p.occupation,
      city: p.city,
      profileAgeDays: p.score.historyDays,
      coldStartStatus: p.coldStart ? 'BUILDING_PROFILE' : 'ESTABLISHED',
      starterEligibility: p.decision.recommendedLimit,
      score: {
        total: p.score.total,
        grade: p.score.total >= 750 ? 'EXCELLENT' : p.score.total >= 650 ? 'GOOD' : 'FAIR',
      },
      riskLevel: p.score.riskCategory.toUpperCase(),
      riskEventsCount: p.id === 'flagged' ? 2 : 0,
      latestApplication: {
        requestedAmount: p.decision.recommendedLimit,
        status: p.decision.type === 'approve' ? 'APPROVED' : p.decision.type === 'decline' ? 'REJECTED' : 'PENDING',
      },
    }));
  }, [liveApplicants, personas]);

  // Compute stats
  const stats = useMemo(() => {
    let low = 0, mod = 0, high = 0;
    let totalLimit = 0;

    applicantsList.forEach((a) => {
      const r = (a.riskLevel || 'MODERATE').toUpperCase();
      if (r === 'LOW') low++;
      else if (r === 'HIGH') high++;
      else mod++;

      totalLimit += a.starterEligibility || a.score?.total ? 10000 : 0;
    });

    return {
      total: applicantsList.length,
      low,
      mod,
      high,
      totalLimit,
      repaymentPerformance: 94,
    };
  }, [applicantsList]);

  function handleViewApplicant(id: string) {
    router.push(`/lender/${id}`);
  }

  return (
    <div className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.4rem' }}>
              <ShieldCheck size={26} style={{ color: 'var(--gold)' }} />
              {t(language, 'lenderDashboard')} — Institutional Underwriting
            </h1>
            <p className="text-sm text-muted mt-1">
              Real-time portfolio cash-flow credit intelligence & risk underwriting
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={fetchApplicants}
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={isLoading ? 'spin' : ''} /> Refresh Pool
            </button>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-4)',
                background: 'var(--color-green-bg)',
                border: '1px solid #86efac',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8125rem',
                color: 'var(--color-green)',
                fontWeight: 600,
              }}
            >
              <span>●</span> {stats.repaymentPerformance}% On-Time Repayment
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid-4 mb-8">
        <div className="stat-card">
          <p className="stat-label">Total Verified Applicants</p>
          <p className="stat-value">{stats.total}</p>
          <p className="stat-change">Active Database</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Low Risk Share</p>
          <p className="stat-value text-green">{stats.low}</p>
          <p className="stat-change up">{Math.round((stats.low / Math.max(1, stats.total)) * 100)}% of pool</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Under Review / Building</p>
          <p className="stat-value text-amber">{stats.mod}</p>
          <p className="stat-change">Micro-advances</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Flagged / High Risk</p>
          <p className="stat-value text-red">{stats.high}</p>
          <p className="stat-change down">Anomaly alerts</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          marginBottom: '20px',
          padding: '14px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', minWidth: '260px', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="Search applicants by name, role, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px 8px 34px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              fontSize: '0.85rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={15} style={{ color: 'var(--muted)' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Risk Filter:</span>
          {(['ALL', 'LOW', 'MODERATE', 'HIGH'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setRiskFilter(lvl)}
              style={{
                padding: '4px 12px',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                background: riskFilter === lvl ? 'var(--navy)' : '#fff',
                color: riskFilter === lvl ? '#fff' : 'var(--ink)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Applicant Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">👥 Verified Credit Dossiers</h3>
          <span className="text-xs text-muted">{applicantsList.length} applicant records</span>
        </div>

        <div className="table-container">
          <table aria-label="Applicant portfolio">
            <thead>
              <tr>
                <th>Applicant Profile</th>
                <th>Bahi Score</th>
                <th>Risk Tier</th>
                <th>History</th>
                <th>Eligibility Limit</th>
                <th>Application Status</th>
                <th>Anomalies</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {applicantsList.map((app) => {
                const scoreVal = app.score?.total || 450;
                const risk = (app.riskLevel || 'MODERATE').toLowerCase();

                return (
                  <tr
                    key={app.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleViewApplicant(app.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <td>
                      <div>
                        <p className="font-semibold" style={{ color: 'var(--color-ink)', margin: 0 }}>
                          {app.name}
                        </p>
                        <p className="text-xs text-muted" style={{ margin: 0 }}>
                          {app.occupation} · {app.city}
                        </p>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '1.05rem',
                          fontFamily: 'var(--font-serif)',
                          color: scoreVal >= 700 ? '#166534' : scoreVal >= 550 ? '#D97706' : '#DC2626',
                        }}
                      >
                        {scoreVal}
                      </span>
                    </td>
                    <td>
                      <span className={`risk-badge ${risk}`}>
                        {risk.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm font-semibold">{app.profileAgeDays} days</span>
                    </td>
                    <td>
                      <span className="font-semibold inr-amount">
                        ₹{(app.starterEligibility || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`decision-badge ${
                          app.latestApplication?.status === 'APPROVED'
                            ? 'approve'
                            : app.latestApplication?.status === 'REJECTED'
                            ? 'decline'
                            : 'review'
                        }`}
                      >
                        {app.latestApplication?.status || 'STARTER'}
                      </span>
                    </td>
                    <td>
                      {app.riskEventsCount > 0 ? (
                        <span
                          style={{
                            color: '#DC2626',
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <AlertOctagon size={13} /> {app.riskEventsCount} Flagged
                        </span>
                      ) : (
                        <span style={{ color: '#166534', fontSize: '0.78rem', fontWeight: 600 }}>✓ Clean</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewApplicant(app.id);
                        }}
                      >
                        Inspect Dossier →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

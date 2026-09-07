'use client';

import React from 'react';
import type { Transaction } from '@/types';
import { useApp } from '@/lib/context/AppContext';
import { getDictionary } from '@/lib/i18n/translations';
import { DailyIncomeChart, CashBufferChart } from '@/components/charts/Charts';
import { Wallet, ArrowDownRight, ArrowUpRight, Activity, PiggyBank, Calendar } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  personaName: string;
  historyDays: number;
}

export default function BahiCashFlow({ transactions, personaName, historyDays }: Props) {
  const { language } = useApp();
  const dict = getDictionary(language);

  const incomeTxns = transactions.filter((t) => t.type === 'income' || t.type === 'transfer');
  const expenseTxns = transactions.filter((t) => t.type === 'expense');

  const totalIncome = incomeTxns.reduce((a, t) => a + t.amount, 0);
  const totalExpenses = expenseTxns.reduce((a, t) => a + t.amount, 0);
  const netCashFlow = totalIncome - totalExpenses;

  const activeDates = new Set(incomeTxns.map((t) => t.date));
  const activeDays = activeDates.size;
  const avgDailyIncome = activeDays > 0 ? Math.round(totalIncome / activeDays) : 0;

  const balances = transactions.map((t) => t.balance).filter((b) => b !== undefined && b !== null);
  const avgBalance = balances.length > 0 ? Math.round(balances.reduce((a, b) => a + b, 0) / balances.length) : 0;
  const currentBalance = transactions[transactions.length - 1]?.balance || 0;

  return (
    <section className="bahi-cashflow-section">
      <div className="section-header-left">
        <div className="section-eyebrow">
          <Activity size={14} /> {dict.cashFlowEyebrow}
        </div>
        <h2 className="section-title">
          {dict.cashFlowTitlePrefix} {personaName} {dict.cashFlowTitleSuffix}
        </h2>
        <p className="section-subtitle">
          {dict.cashFlowSubtitle} {historyDays} {dict.observedDays}
        </p>
      </div>

      {/* 6 Key Financial Metrics Grid */}
      <div className="bahi-metrics-grid">
        <div className="bahi-metric-card">
          <div className="metric-header">
            <span className="metric-icon-wrap income"><ArrowDownRight size={16} /></span>
            <span className="metric-label">{dict.totalIncome}</span>
          </div>
          <p className="metric-value text-green inr-amount">₹{totalIncome.toLocaleString('en-IN')}</p>
          <p className="metric-hint">{dict.acrossActiveDays} ({activeDays}d)</p>
        </div>

        <div className="bahi-metric-card">
          <div className="metric-header">
            <span className="metric-icon-wrap expense"><ArrowUpRight size={16} /></span>
            <span className="metric-label">{dict.operatingExpenses}</span>
          </div>
          <p className="metric-value text-red inr-amount">₹{totalExpenses.toLocaleString('en-IN')}</p>
          <p className="metric-hint">{dict.operatingExpensesHint}</p>
        </div>

        <div className="bahi-metric-card highlight">
          <div className="metric-header">
            <span className="metric-icon-wrap bahi"><Wallet size={16} /></span>
            <span className="metric-label">{dict.netCashFlow}</span>
          </div>
          <p className="metric-value inr-amount" style={{ color: netCashFlow >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
            ₹{netCashFlow.toLocaleString('en-IN')}
          </p>
          <p className="metric-hint">{netCashFlow >= 0 ? dict.positiveSurplus : dict.negativeDeficit}</p>
        </div>

        <div className="bahi-metric-card">
          <div className="metric-header">
            <span className="metric-icon-wrap bahi"><Calendar size={16} /></span>
            <span className="metric-label">{dict.avgDailyEarnings}</span>
          </div>
          <p className="metric-value inr-amount">₹{avgDailyIncome.toLocaleString('en-IN')}</p>
          <p className="metric-hint">{dict.perActiveDay}</p>
        </div>

        <div className="bahi-metric-card">
          <div className="metric-header">
            <span className="metric-icon-wrap bahi"><PiggyBank size={16} /></span>
            <span className="metric-label">{dict.averageBalance}</span>
          </div>
          <p className="metric-value inr-amount">₹{avgBalance.toLocaleString('en-IN')}</p>
          <p className="metric-hint">{dict.maintainedLiquidity}</p>
        </div>

        <div className="bahi-metric-card">
          <div className="metric-header">
            <span className="metric-icon-wrap bahi"><Wallet size={16} /></span>
            <span className="metric-label">{dict.closingBalance}</span>
          </div>
          <p className="metric-value inr-amount">₹{currentBalance.toLocaleString('en-IN')}</p>
          <p className="metric-hint">{dict.recentLedgerBalance}</p>
        </div>
      </div>

      {/* Two Financial Charts Grid */}
      <div className="bahi-charts-grid">
        <div className="bahi-chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">{dict.dailyEarningActivity}</h3>
              <p className="chart-sub">{dict.dailyVolumeSub}</p>
            </div>
            <span className="chart-tag">Volume</span>
          </div>
          <div className="chart-wrap">
            <DailyIncomeChart transactions={transactions} />
          </div>
        </div>

        <div className="bahi-chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">{dict.liquidityCurve}</h3>
              <p className="chart-sub">{dict.liquidityCurveSub}</p>
            </div>
            <span className="chart-tag">Liquidity</span>
          </div>
          <div className="chart-wrap">
            <CashBufferChart transactions={transactions} />
          </div>
        </div>
      </div>
    </section>
  );
}

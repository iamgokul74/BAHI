'use client';

import React, { useState } from 'react';
import type { Transaction } from '@/types';
import { useApp } from '@/lib/context/AppContext';
import { getDictionary } from '@/lib/i18n/translations';
import { ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  personaName: string;
}

export default function BahiTransactionTimeline({ transactions, personaName }: Props) {
  const { language } = useApp();
  const dict = getDictionary(language);
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [displayCount, setDisplayCount] = useState(8);

  const sortedTxns = [...transactions].sort((a, b) => b.date.localeCompare(a.date));

  const filtered = sortedTxns.filter((t) => {
    if (filterType === 'INCOME') return t.type === 'income' || t.type === 'transfer';
    if (filterType === 'EXPENSE') return t.type === 'expense';
    return true;
  });

  const visible = filtered.slice(0, displayCount);

  return (
    <section className="bahi-transactions-section">
      <div className="section-header-split">
        <div>
          <div className="section-eyebrow">
            <Receipt size={14} /> {dict.txEyebrow}
          </div>
          <h2 className="section-title">{dict.txTitle}</h2>
          <p className="section-subtitle">
            {dict.txSubtitlePrefix} {personaName} ({transactions.length} {dict.totalEntries}).
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="tx-filter-group">
          {(['ALL', 'INCOME', 'EXPENSE'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`tx-filter-btn ${filterType === type ? 'active' : ''}`}
            >
              {type === 'ALL' ? dict.filterAll : type === 'INCOME' ? dict.filterIncome : dict.filterExpense}
            </button>
          ))}
        </div>
      </div>

      <div className="bahi-tx-timeline-card">
        <div className="tx-list">
          {visible.map((tx, idx) => {
            const isIncome = tx.type === 'income' || tx.type === 'transfer';

            return (
              <div key={tx.id || idx} className="tx-timeline-row">
                <div className="tx-row-left">
                  <div className={`tx-icon-pill ${isIncome ? 'income' : 'expense'}`}>
                    {isIncome ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div className="tx-details">
                    <h4 className="tx-desc">{tx.description}</h4>
                    <div className="tx-meta-row">
                      <span className="tx-date">{tx.date}</span>
                      <span className="tx-bullet">·</span>
                      <span className="tx-category-badge">{tx.category}</span>
                    </div>
                  </div>
                </div>

                <div className="tx-row-right">
                  <div className={`tx-amount ${isIncome ? 'income' : 'expense'} inr-amount`}>
                    {isIncome ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                  </div>
                  <div className="tx-balance inr-amount">
                    {dict.balanceLabel}: ₹{tx.balance?.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {displayCount < filtered.length && (
          <div className="tx-footer-cta">
            <button
              onClick={() => setDisplayCount((prev) => Math.min(filtered.length, prev + 10))}
              className="btn-load-more"
            >
              {dict.showMoreTx} ({filtered.length - displayCount} {dict.remaining}) ↓
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

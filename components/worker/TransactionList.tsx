'use client';

import React, { useState } from 'react';
import type { Transaction, Language } from '@/types';
import { t } from '@/lib/i18n/translations';

interface Props {
  transactions: Transaction[];
  language: Language;
}

const CATEGORY_LABELS: Record<string, string> = {
  ride_earnings: 'Ride Earnings',
  delivery_earnings: 'Delivery',
  merchant_sales: 'Shop Sales',
  freelance: 'Freelance',
  food: 'Food',
  transport: 'Transport',
  utilities: 'Utilities',
  rent: 'Rent',
  loan_repayment: 'Loan Repayment',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
  other: 'Other',
};

const TYPE_COLORS: Record<string, string> = {
  income: 'var(--color-green)',
  expense: 'var(--color-red)',
  transfer: 'var(--color-bahi)',
  repayment: 'var(--color-amber)',
};

export default function TransactionList({ transactions, language }: Props) {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  const filtered = sorted.filter((tx) => filter === 'all' || tx.type === filter);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">📋 {t(language, 'transactionHistory')}</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'income', 'expense'] as const).map((f) => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setFilter(f); setPage(0); }}
              id={`txn-filter-${f}-btn`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="table-container">
        <table aria-label="Transaction history">
          <thead>
            <tr>
              <th>{t(language, 'date')}</th>
              <th>{t(language, 'description')}</th>
              <th>{t(language, 'category')}</th>
              <th style={{ textAlign: 'right' }}>{t(language, 'amount')}</th>
              <th style={{ textAlign: 'right' }}>{t(language, 'balance')}</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((tx) => (
              <tr key={tx.id}>
                <td className="text-xs" style={{ whiteSpace: 'nowrap' }}>
                  {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </td>
                <td>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-ink)' }}>
                    {tx.description}
                  </span>
                  <br />
                  <span className="text-xs text-muted">{tx.source}</span>
                </td>
                <td>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--color-border-light)',
                    color: 'var(--color-ink-secondary)',
                  }}>
                    {CATEGORY_LABELS[tx.category] || tx.category}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span style={{
                    fontWeight: 600,
                    color: TYPE_COLORS[tx.type] || 'var(--color-ink)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {tx.type === 'income' || tx.type === 'transfer' ? '+' : '-'}
                    ₹{tx.amount.toLocaleString('en-IN')}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="text-sm inr-amount" style={{ color: 'var(--color-ink-tertiary)' }}>
                    ₹{tx.balance.toLocaleString('en-IN')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <button
              className="btn btn-secondary btn-sm"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              id="txn-prev-btn"
            >
              ← Prev
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              id="txn-next-btn"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted mt-3 text-center">
        🔬 {t(language, 'simulated')}
      </p>
    </div>
  );
}

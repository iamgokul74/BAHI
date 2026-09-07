'use client';

import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import type { Transaction } from '@/types';

// ── Daily Income Chart ──────────────────────────────────
interface DailyIncomeProps {
  transactions: Transaction[];
}

export function DailyIncomeChart({ transactions }: DailyIncomeProps) {
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => {
      const existing = acc.find((d) => d.date === t.date);
      if (existing) { existing.amount += t.amount; }
      else acc.push({ date: t.date, amount: t.amount });
      return acc;
    }, [] as Array<{ date: string; amount: number }>)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  const formatted = income.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    amount: d.amount,
  }));

  return (
    <div style={{ width: '100%', height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formatted} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-paper-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [`₹${Number(value ?? 0).toLocaleString('en-IN')}`, 'Income']}
          />
          <Bar dataKey="amount" fill="var(--color-bahi)" radius={[3, 3, 0, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Cash Buffer Chart ────────────────────────────────────
interface CashBufferProps {
  transactions: Transaction[];
}

export function CashBufferChart({ transactions }: CashBufferProps) {
  const balanceData = transactions
    .slice(-30)
    .map((t) => ({
      date: new Date(t.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      balance: t.balance,
    }));

  return (
    <div style={{ width: '100%', height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={balanceData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-bahi)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="var(--color-bahi)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-paper-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [`₹${Number(value ?? 0).toLocaleString('en-IN')}`, 'Balance']}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="var(--color-bahi)"
            strokeWidth={2}
            fill="url(#balanceGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Score Evolution Chart ─────────────────────────────────
interface ScoreEvolutionProps {
  points: Array<{ date: string; score: number; event?: string }>;
}

export function ScoreEvolutionChart({ points }: ScoreEvolutionProps) {
  const formatted = points.map((p) => ({
    date: new Date(p.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    score: p.score,
    event: p.event,
  }));

  return (
    <div style={{ width: '100%', height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[300, 900]}
            tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-paper-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [Number(value ?? 0), 'Bahi Score']}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--color-green)"
            strokeWidth={2.5}
            dot={{ r: 4, fill: 'var(--color-green)', strokeWidth: 2, stroke: 'white' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Risk Distribution Chart (Lender) ─────────────────────
interface RiskDistributionProps {
  low: number;
  medium: number;
  high: number;
  building: number;
}

export function RiskDistributionChart({ low, medium, high, building }: RiskDistributionProps) {
  const data = [
    { name: 'Low', count: low, fill: 'var(--color-green)' },
    { name: 'Medium', count: medium, fill: 'var(--color-amber)' },
    { name: 'High', count: high, fill: 'var(--color-red)' },
    { name: 'Building', count: building, fill: 'var(--color-bahi)' },
  ];

  return (
    <div style={{ width: '100%', height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: 'var(--color-ink-secondary)' }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-paper-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [Number(value ?? 0), 'Applicants']}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {data.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

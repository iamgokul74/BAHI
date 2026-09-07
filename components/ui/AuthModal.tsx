'use client';

import React, { useState } from 'react';
import { User, Lock, Mail, UserPlus, LogIn, CheckCircle2, Shield, X, Sparkles } from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { currentUser, switchDemoPersona, refreshData } = useApp();
  const [tab, setTab] = useState<'switch' | 'login' | 'register'>('switch');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [occupation, setOccupation] = useState('Gig Worker / Driver');
  const [role, setRole] = useState<'BORROWER' | 'LENDER'>('BORROWER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setSuccess('Logged in successfully!');
      await refreshData();
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Login error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role, occupation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setSuccess('Account registered & logged in!');
      await refreshData();
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Registration error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSwitch = async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      await switchDemoPersona(key);
      setSuccess(`Switched to demo persona!`);
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Switch error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            backgroundColor: 'var(--navy)',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={20} style={{ color: 'var(--gold)' }} />
              BAHI Identity & Authentication
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
              Current User: {currentUser ? `${currentUser.name} (${currentUser.role})` : 'Not logged in'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--cream)' }}>
          <button
            onClick={() => setTab('switch')}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              border: 'none',
              background: tab === 'switch' ? '#fff' : 'transparent',
              borderBottom: tab === 'switch' ? '2px solid var(--gold)' : 'none',
              cursor: 'pointer',
              color: 'var(--navy)',
            }}
          >
            Demo Profiles
          </button>
          <button
            onClick={() => setTab('login')}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              border: 'none',
              background: tab === 'login' ? '#fff' : 'transparent',
              borderBottom: tab === 'login' ? '2px solid var(--gold)' : 'none',
              cursor: 'pointer',
              color: 'var(--navy)',
            }}
          >
            Login
          </button>
          <button
            onClick={() => setTab('register')}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              border: 'none',
              background: tab === 'register' ? '#fff' : 'transparent',
              borderBottom: tab === 'register' ? '2px solid var(--gold)' : 'none',
              cursor: 'pointer',
              color: 'var(--navy)',
            }}
          >
            Create Account
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {error && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                backgroundColor: '#FEF2F2',
                color: '#B91C1C',
                borderRadius: '6px',
                fontSize: '0.85rem',
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                backgroundColor: '#F0FDF4',
                color: '#166534',
                borderRadius: '6px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} /> {success}
            </div>
          )}

          {tab === 'switch' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '4px' }}>
                Quickly load seeded borrowers with persisted transactions or log in as a Lender:
              </div>

              {[
                { key: 'cab_driver', name: 'Ravi Kumar', desc: 'Cab Driver — 90-day established, 782 Score', badge: 'ESTABLISHED' },
                { key: 'new_rider', name: 'Priya Sharma', desc: 'New Rider — 14-day building profile, 645 Score', badge: 'BUILDING' },
                { key: 'kirana_merchant', name: 'Amit Patel', desc: 'Kirana Merchant — 60-day daily counter sales, 748 Score', badge: 'MERCHANT' },
                { key: 'volatile_gig', name: 'Sunita Devi', desc: 'Volatile Gig Worker — 45-day uneven delivery flow, 692 Score', badge: 'GIG VOLATILE' },
                { key: 'flagged', name: 'Vikram Singh', desc: 'Flagged Profile — 30-day identical amount anomalies, 412 Score', badge: 'FLAGGED' },
                { key: 'lender', name: 'FinFlow NBFC Officer', desc: 'Lender Role — Underwriting Command Center & Approvals', badge: 'LENDER ROLE' },
              ].map((p) => (
                <button
                  key={p.key}
                  disabled={loading}
                  onClick={() => handleDemoSwitch(p.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--cream)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--navy)' }}>{p.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{p.desc}</div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      backgroundColor: p.key === 'lender' ? 'var(--navy)' : 'var(--gold)',
                      color: '#fff',
                    }}
                  >
                    {p.badge}
                  </span>
                </button>
              ))}
            </div>
          )}

          {tab === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--muted)' }} />
                  <input
                    type="email"
                    required
                    placeholder="user@bahi.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px 8px 34px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--muted)' }} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px 8px 34px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '6px' }}
              >
                <LogIn size={16} /> {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Email</label>
                <input
                  type="email"
                  required
                  placeholder="ramesh@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Password</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <option value="BORROWER">Borrower (Worker / Merchant)</option>
                    <option value="LENDER">Lender (Credit Underwriter)</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Occupation</label>
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="e.g. Auto Driver, Delivery"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '8px' }}
              >
                <UserPlus size={16} /> {loading ? 'Creating Account...' : 'Register & Log In'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

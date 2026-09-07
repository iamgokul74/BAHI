import React from 'react';

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '1rem',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div style={{ fontSize: '3rem' }}>📊</div>
      <h1 style={{ fontSize: '1.5rem', color: 'var(--color-ink)' }}>Page Not Found</h1>
      <p style={{ color: 'var(--color-ink-muted)' }}>
        This page doesn&apos;t exist in the BAHI platform.
      </p>
      <a
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '10px 20px',
          background: 'var(--color-bahi)',
          color: 'white',
          borderRadius: '10px',
          textDecoration: 'none',
          fontWeight: 500,
        }}
      >
        ← Return to Dashboard
      </a>
    </div>
  );
}

'use client';

import React from 'react';
import { useApp } from '@/lib/context/AppContext';
import type { PersonaId } from '@/types';

export default function PersonaSelector() {
  const { personas, selectedPersonaId, setPersona } = useApp();

  return (
    <div>
      <p className="text-xs text-muted mb-2 font-semibold" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Select Profile
      </p>
      <div className="persona-selector" role="group" aria-label="Select persona">
        {personas.map((p) => (
          <button
            key={p.id}
            id={`persona-${p.id}-btn`}
            className={`persona-btn${selectedPersonaId === p.id ? ' active' : ''}`}
            onClick={() => setPersona(p.id as PersonaId)}
            aria-pressed={selectedPersonaId === p.id}
            aria-label={`Select ${p.name} — ${p.occupation}`}
          >
            <span className="persona-avatar">{p.avatar}</span>
            <span className="persona-name">{p.name.split(' ')[0]}</span>
            {p.coldStart && (
              <span style={{ fontSize: '0.65rem', color: 'var(--color-bahi)', fontWeight: 600 }}>New</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

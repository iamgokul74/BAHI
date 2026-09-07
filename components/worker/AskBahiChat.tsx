'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { Persona, Language } from '@/types';
import { t } from '@/lib/i18n/translations';

interface Props {
  persona: Persona;
  language: Language;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function generateLocalAnswer(question: string, persona: Persona): string {
  const q = question.toLowerCase();
  const score = persona.score;
  const decision = persona.decision;
  const weakest = [...score.factors].sort((a, b) => a.score - b.score)[0];
  const strongest = [...score.factors].sort((a, b) => b.score - a.score)[0];

  if (q.includes('score') && (q.includes('why') || q.includes('low') || q.includes('reason'))) {
    return `${persona.name}'s Bahi Score is ${score.total}/900. Here's why:

**Strongest factor:** ${strongest.name} (${strongest.score}/100, ${strongest.weight}% weight)
${strongest.explanation}

**Limiting factor:** ${weakest.name} (${weakest.score}/100, ${weakest.weight}% weight)
${weakest.explanation}

The score is calculated deterministically from ${score.historyDays} days of verified transaction data, with ${score.confidence}% confidence.`;
  }

  if (q.includes('improve') || q.includes('increase') || q.includes('better') || q.includes('higher')) {
    const potentialGain = Math.round((100 - weakest.score) * weakest.weight * 0.6 / 100 * 6);
    return `The biggest opportunity to improve ${persona.name}'s score is **${weakest.name}** (currently ${weakest.score}/100).

${weakest.explanation}

**Potential impact:** Improving this factor could add approximately ${potentialGain} points, moving from ${score.total} toward ${Math.min(900, score.total + potentialGain)}+.

${decision.improvements.map((imp, i) => `${i + 1}. ${imp}`).join('\n')}

Note: These calculations are derived from your real cash-flow history.`;
  }

  if (q.includes('limit') || q.includes('eligible') || q.includes('borrow') || q.includes('advance') || q.includes('how much')) {
    if (decision.recommendedLimit === 0) {
      return `Currently ${persona.name} is not eligible for a credit advance. Reason: ${decision.reasons[0]}

To become eligible: ${decision.improvements[0]}`;
    }
    return `${persona.name} is eligible for up to ₹${decision.recommendedLimit.toLocaleString('en-IN')} (Decision: ${decision.type.replace('_', ' ').toUpperCase()}).

**Why this amount:**
- Bahi Score: ${score.total} (${score.riskCategory} risk)
- Repayment period: ${decision.repaymentDays} days
- Repayment confidence: ${decision.repaymentConfidence}%

${decision.reasons.join('\n')}`;
  }

  if (q.includes('cash buffer') || q.includes('balance')) {
    const cashFactor = score.factors.find((f) => f.key === 'cashBuffer');
    return `**Cash Buffer Analysis:**

${cashFactor?.explanation}

Cash buffer score: ${cashFactor?.score}/100 (weight: ${cashFactor?.weight}%)

The cash buffer factor measures how much savings are maintained relative to monthly income. A higher buffer indicates lower financial stress and better repayment capacity.`;
  }

  if (q.includes('integrity') || q.includes('flag') || q.includes('suspicious') || q.includes('anomaly')) {
    const intFactor = score.factors.find((f) => f.key === 'integrity');
    return `**Integrity Check Result:**

${intFactor?.explanation}

Score: ${intFactor?.score}/100 (weight: ${intFactor?.weight}%)

BAHI's integrity check looks for suspicious patterns like identical transaction amounts, unnaturally regular timing, or unrealistic income patterns. Legitimate gig-worker income is typically variable, which is why BAHI distinguishes healthy volatility from suspicious uniformity.`;
  }

  // Default
  return `I can help analyze ${persona.name}'s financial profile. Here's a quick summary:

**Bahi Score:** ${score.total}/900 (${score.riskCategory} risk)
**Credit Eligibility:** ₹${decision.recommendedLimit.toLocaleString('en-IN')} (${decision.type.replace('_', ' ')})
**Repayment Confidence:** ${decision.repaymentConfidence}%

Try asking about:
- "Why is my score ${score.total}?"
- "How can I improve my score?"
- "How much can I borrow?"
- "What is my cash buffer?"
- "Explain the integrity check"`;
}

export default function AskBahiChat({ persona, language }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi! I'm Bahi AI. I can explain ${persona.name}'s credit profile, score factors, and improvement opportunities. What would you like to know?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Reset when persona changes
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: `Hi! I'm Bahi AI. I can explain ${persona.name}'s credit profile, score factors, and improvement opportunities. What would you like to know?`,
      },
    ]);
  }, [persona.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const quickQuestions = [
    'Why is my score this number?',
    'How can I improve?',
    'How much can I borrow?',
    'Explain the integrity check',
  ];

  async function sendMessage(question: string) {
    if (!question.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, language }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
      } else {
        const fallback = generateLocalAnswer(question, persona);
        setMessages((prev) => [...prev, { role: 'assistant', content: fallback }]);
      }
    } catch {
      const fallback = generateLocalAnswer(question, persona);
      setMessages((prev) => [...prev, { role: 'assistant', content: fallback }]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div className="card-header">
        <h3 className="card-title">
          🤖 {t(language, 'askBahi')}
          <span
            style={{
              fontSize: '0.7rem',
              background: 'var(--color-purple-bg)',
              color: 'var(--color-purple)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              fontWeight: 600,
            }}
          >
            {t(language, 'aiPowered')}
          </span>
        </h3>
      </div>

      {/* Messages */}
      <div
        style={{
          height: 300,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          padding: 'var(--space-2)',
          background: 'var(--color-paper)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border-light)',
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`ai-message ${msg.role}`}
            style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
          >
            {msg.content.split('\n').map((line, li) => {
              if (line.startsWith('**') && line.endsWith('**')) {
                return (
                  <strong key={li} style={{ display: 'block', marginBottom: 2 }}>
                    {line.replace(/\*\*/g, '')}
                  </strong>
                );
              }
              return (
                <span key={li} style={{ display: 'block' }}>
                  {line || '\u00A0'}
                </span>
              );
            })}
          </div>
        ))}
        {isLoading && (
          <div className="ai-message assistant" style={{ alignSelf: 'flex-start' }}>
            <span className="animate-pulse">Consulting cash-flow intelligence...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Questions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
        {quickQuestions.map((q) => (
          <button
            key={q}
            className="btn btn-secondary btn-sm"
            onClick={() => sendMessage(q)}
            disabled={isLoading}
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="ai-input-row">
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t(language, 'askBahiPlaceholder')}
          disabled={isLoading}
          aria-label="Ask Bahi AI a question"
          id="ask-bahi-input"
        />
        <button
          type="submit"
          id="ask-bahi-send-btn"
          className="btn btn-primary"
          disabled={isLoading || !input.trim()}
          aria-label="Send question"
        >
          {t(language, 'sendQuestion')}
        </button>
      </form>

      <p className="text-xs text-muted" style={{ textAlign: 'center' }}>
        {t(language, 'transparencyNote')}
      </p>
    </div>
  );
}

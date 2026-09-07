'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { Persona } from '@/types';
import { useApp } from '@/lib/context/AppContext';
import { getDictionary } from '@/lib/i18n/translations';
import { Bot, Send, User } from 'lucide-react';

interface Props {
  persona: Persona;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function BahiAskAI({ persona }: Props) {
  const { language } = useApp();
  const dict = getDictionary(language);

  const getInitialMessage = () => {
    if (language === 'hi') {
      return `नमस्ते! मैं बाही इंटेलिजेंस हूँ। मैंने ${persona.name} के सत्यापित स्टेटमेंट इतिहास (${persona.score.historyDays} दिन) का विश्लेषण किया है। स्कोर कारकों, क्रेडिट पात्रता, नकद बफर या ऋण सीमा के बारे में कुछ भी पूछें!`;
    }
    if (language === 'ta') {
      return `வணக்கம்! நான் பாஹி நுண்ணறிவு. ${persona.name} இன் சரிபார்க்கப்பட்ட அறிக்கை வரலாற்றை (${persona.score.historyDays} நாட்கள்) பகுப்பாய்வு செய்துள்ளேன். மதிப்பெண், கடன் தகுதி அல்லது பண இருப்பு பற்றி கேளுங்கள்!`;
    }
    return `Hello! I am BAHI Intelligence. I have analyzed ${persona.name}'s verified statement history (${persona.score.historyDays} days, ${persona.transactions.length} transactions). Ask me anything about score factors, credit eligibility, cash buffers, or how to expand borrowing limits!`;
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: getInitialMessage(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Reset when persona or language changes
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: getInitialMessage(),
      },
    ]);
  }, [persona.id, language]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const suggestedQuestions = language === 'hi' ? [
    `${persona.name.split(' ')[0]} का स्कोर ${persona.score.total} क्यों है?`,
    'मैं अपना स्कोर कैसे सुधार सकता हूँ?',
    'मेरा सबसे मजबूत वित्तीय कारक क्या है?',
    'मैं अभी कितना ऋण ले सकता हूँ?',
    'सत्यनिष्ठा जाँच की व्याख्या करें',
  ] : language === 'ta' ? [
    `${persona.name.split(' ')[0]} இன் மதிப்பெண் ${persona.score.total} ஆக இருப்பது ஏன்?`,
    'என் மதிப்பெண்ணை எப்படி மேம்படுத்துவது?',
    'என் வலுவான நிதி காரணி எது?',
    'நான் இப்போது எவ்வளவு கடன் வாங்கலாம்?',
    'நேர்மை சோதனையை விளக்குக',
  ] : [
    `Why is ${persona.name.split(' ')[0]}'s score ${persona.score.total}?`,
    'How can I improve my score?',
    'What is my strongest financial factor?',
    'How much can I borrow right now?',
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
        body: JSON.stringify({ 
          question, 
          language,
          personaEmail: persona.id === 'new_rider' ? 'priya@bahi.in' : 'ravi@bahi.in',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
      } else {
        throw new Error('Fallback');
      }
    } catch {
      // Local grounded fallback
      const q = question.toLowerCase();
      let fallbackText = '';
      const score = persona.score;
      const weakest = [...score.factors].sort((a, b) => a.score - b.score)[0];
      const strongest = [...score.factors].sort((a, b) => b.score - a.score)[0];

      if (q.includes('why') || q.includes('score') || q.includes('क्यों') || q.includes('ஏன்')) {
        fallbackText = `${persona.name}'s Bahi Score is **${score.total}/900** (${score.riskCategory.toUpperCase()} Risk).\n\n• **Strongest Factor:** ${strongest.name} (${strongest.score}/100) — ${strongest.explanation}\n• **Limiting Factor:** ${weakest.name} (${weakest.score}/100) — ${weakest.explanation}\n\nThis is derived from ${score.historyDays} days of verified earning patterns with ${score.confidence}% data confidence.`;
      } else if (q.includes('improve') || q.includes('सुधार') || q.includes('மேம்படுத்த')) {
        fallbackText = `To improve ${persona.name}'s score, the highest-leverage factor is **${weakest.name}** (currently scored at ${weakest.score}/100).\n\n**Actionable Step:** ${persona.decision.improvements[0] || 'Maintain steady daily earnings.'}\n\nAdditionally, completing on-time repayments adds to the behavioral profile!`;
      } else if (q.includes('borrow') || q.includes('advance') || q.includes('ऋण') || q.includes('கடன்')) {
        fallbackText = `${persona.name} is currently eligible for up to **₹${persona.decision.recommendedLimit.toLocaleString('en-IN')}** under the ${persona.decision.type.replace('_', ' ').toUpperCase()} underwriting policy (${persona.decision.repaymentDays} days tenure, ${persona.decision.repaymentConfidence}% repayment confidence).`;
      } else {
        fallbackText = `Based on ${persona.name}'s verified financial behavior: Total income is ₹${persona.transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0).toLocaleString('en-IN')}, Bahi Score is **${score.total}**, and the account is assessed as ${score.riskCategory.toUpperCase()} risk.`;
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: fallbackText }]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <section className="bahi-ai-section">
      <div className="section-header-left">
        <div className="section-eyebrow">
          <Bot size={14} /> {dict.aiEyebrow}
        </div>
        <h2 className="section-title">{dict.aiTitle}</h2>
        <p className="section-subtitle">
          {dict.aiSubtitlePrefix} {persona.name}{dict.aiSubtitleSuffix}
        </p>
      </div>

      <div className="bahi-ai-chat-card">
        {/* Chat Header */}
        <div className="ai-chat-header">
          <div className="ai-chat-header-left">
            <div className="ai-status-indicator">
              <span className="pulse-dot" />
              <Bot size={18} />
            </div>
            <div>
              <h4 className="ai-header-title">{dict.aiHeaderTitle}</h4>
              <p className="ai-header-sub">{dict.aiHeaderSub}</p>
            </div>
          </div>
          <span className="ai-grounded-tag">{dict.aiGroundedTag}</span>
        </div>

        {/* Messages Stream */}
        <div className="ai-messages-container">
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';

            return (
              <div key={i} className={`ai-message-bubble ${isUser ? 'user' : 'assistant'}`}>
                <div className="message-avatar">
                  {isUser ? <User size={15} /> : <Bot size={15} />}
                </div>
                <div className="message-text">
                  {msg.content.split('\n').map((line, li) => {
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return <strong key={li} className="msg-strong">{line.replace(/\*\*/g, '')}</strong>;
                    }
                    if (line.startsWith('• ') || line.startsWith('- ')) {
                      return <div key={li} className="msg-bullet">{line}</div>;
                    }
                    return <p key={li} className="msg-para">{line || '\u00A0'}</p>;
                  })}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="ai-message-bubble assistant loading">
              <div className="message-avatar"><Bot size={15} /></div>
              <div className="message-text">
                <span className="ai-typing-indicator">{dict.consultingEngine}</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested Question Chips */}
        <div className="ai-chips-row">
          <span className="chips-label">{dict.quickPrompts}</span>
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => sendMessage(q)}
              disabled={isLoading}
              className="ai-chip-btn"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="ai-input-bar">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={dict.askPlaceholder}
            disabled={isLoading}
            className="ai-chat-input"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="ai-send-btn"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </section>
  );
}

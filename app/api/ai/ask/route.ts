import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { calculateBahiScore } from '@/lib/scoring/engine';
import { calculateCreditDecision } from '@/lib/decisions/engine';
import { analyzeFinancialBehavior } from '@/lib/intelligence/financial-intelligence.service';
import type { Transaction as AppTransaction } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json().catch(() => ({}));
    const { question, language = 'en', personaEmail, personaId } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // Determine target user ID or demo email
    let user = null;
    if (session?.userId && !personaEmail && !personaId) {
      user = await db.user.findUnique({
        where: { id: session.userId },
        include: {
          profile: true,
          transactions: { orderBy: { date: 'asc' } },
          bahiScores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
          creditApplications: { orderBy: { createdAt: 'desc' }, take: 1 },
          loans: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { repayments: true },
          },
          riskEvents: { where: { isResolved: false } },
          scoreHistories: { orderBy: { createdAt: 'desc' }, take: 2 },
        },
      });
    }

    if (!user) {
      let emailLookup = (personaEmail || '').toLowerCase().trim();
      if (!emailLookup && personaId) {
        if (personaId === 'cab_driver' || personaId === 'ravi') emailLookup = 'ravi@bahi.in';
        else if (personaId === 'new_rider' || personaId === 'priya') emailLookup = 'priya@bahi.in';
        else if (personaId === 'volatile_gig' || personaId === 'sunita') emailLookup = 'sunita@bahi.in';
        else if (personaId === 'flagged' || personaId === 'vikram') emailLookup = 'vikram@bahi.in';
      }
      if (!emailLookup) {
        emailLookup = 'priya@bahi.in';
      }
      user = await db.user.findUnique({
        where: { email: emailLookup },
        include: {
          profile: true,
          transactions: { orderBy: { date: 'asc' } },
          bahiScores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
          creditApplications: { orderBy: { createdAt: 'desc' }, take: 1 },
          loans: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { repayments: true },
          },
          riskEvents: { where: { isResolved: false } },
          scoreHistories: { orderBy: { createdAt: 'desc' }, take: 2 },
        },
      });

      if (!user) {
        user = await db.user.findFirst({
          where: { email: 'priya@bahi.in' },
          include: {
            profile: true,
            transactions: { orderBy: { date: 'asc' } },
            bahiScores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
            creditApplications: { orderBy: { createdAt: 'desc' }, take: 1 },
            loans: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { repayments: true },
            },
            riskEvents: { where: { isResolved: false } },
            scoreHistories: { orderBy: { createdAt: 'desc' }, take: 2 },
          },
        });
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const appTxns: AppTransaction[] = user.transactions.map((t) => ({
      id: t.id,
      date: t.date.toISOString().split('T')[0],
      description: t.description,
      amount: t.amount,
      type: t.type.toLowerCase() as 'income' | 'expense',
      category: t.category,
      balance: t.balance,
    }));

    const intelligence = analyzeFinancialBehavior(appTxns);
    const calculatedScore = calculateBahiScore(appTxns);
    const decision = calculateCreditDecision(calculatedScore, appTxns);

    const scoreVal = user.bahiScores[0]?.score || calculatedScore.total;
    const historyDays = intelligence.activity.historyLengthDays;
    const activeLoan = user.loans[0];
    const riskEvents = user.riskEvents;

    const lowerQ = question.toLowerCase();
    let answer = '';

    // Check optional external Gemini key
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are BAHI, an explainable financial credit intelligence AI for gig workers and micro-merchants in India.
User Profile:
- Name: ${user.name}
- Occupation: ${user.profile?.occupation}
- City: ${user.profile?.city}
- Bahi Score: ${scoreVal} / 900 (Risk Band: ${calculatedScore.riskCategory.toUpperCase()})
- Confidence: ${intelligence.confidence.confidencePercentage}% (${intelligence.confidence.confidenceLevel})
- History Observed: ${historyDays} days
- Monthly Total Income: ₹${intelligence.income.totalIncome} (Monthly Avg: ₹${intelligence.income.monthlyAverageIncome})
- Total Expenses: ₹${intelligence.expenses.totalExpenses} (Ratio: ${Math.round(intelligence.expenses.expenseToIncomeRatio * 100)}%)
- Net Cash Flow: ₹${intelligence.cashFlow.netCashFlow}
- Average Liquidity Buffer: ₹${intelligence.cashFlow.averageBalance} (${intelligence.cashFlow.cashBufferDays} days runway)
- Recommended Credit Limit: ₹${decision.recommendedLimit} (${decision.type.toUpperCase()})
- Lowest Factor: ${decision.recommendations[0]?.factorName || 'Consistency'}
- Unresolved Risk Events: ${riskEvents.map((r) => r.description).join('; ') || 'None'}

User Question: "${question}"
Target Language: ${language}

Provide a concise (2-4 paragraphs), empathetic, concrete, actionable, and strictly factual explanation grounded ONLY in their financial data above in the specified language (${language}). Never make up financial numbers.`;

        const result = await model.generateContent(prompt);
        answer = result.response.text();
      } catch (aiErr) {
        console.warn('External AI call failed, falling back to deterministic explanation engine:', aiErr);
      }
    }

    // Grounded deterministic intelligence engine fallback
    if (!answer) {
      const isHi = language === 'hi';
      const isTa = language === 'ta';

      if (lowerQ.includes('improve') || lowerQ.includes('increase') || lowerQ.includes('higher') || lowerQ.includes('सुधार') || lowerQ.includes('மேம்படுத்த')) {
        const topRec = decision.recommendations[0];
        if (isHi) {
          answer = `${user.name} के बाही स्कोर (वर्तमान में **${scoreVal}/900**) को बेहतर बनाने के लिए:\n\n**1. मुख्य क्षेत्र: ${topRec?.headline || 'आय निरंतरता'}**\n${topRec?.actionableStep || 'नियमित दैनिक कमाई बनाए रखें।'}\n\n**2. अगला मील का पत्थर:** समय पर अग्रिम चुकाने से आपका स्कोर तुरंत बढ़ेगा!`;
        } else if (isTa) {
          answer = `${user.name} இன் பாஹி மதிப்பெண்ணை (தற்போது **${scoreVal}/900**) மேம்படுத்த:\n\n**1. முக்கிய கவனம்: ${topRec?.headline || 'வருமான நிலைத்தன்மை'}**\n${topRec?.actionableStep || 'வழக்கமான தினசரி வருமானத்தைப் பராமரிக்கவும்.'}\n\n**2. அடுத்த மைல்கல்:** சரியான நேரத்தில் கடனை திருப்பிச் செலுத்துவது உங்கள் மதிப்பெண்ணை நேரடியாக உயர்த்தும்!`;
        } else {
          answer = `To improve ${user.name}'s Bahi Score (currently **${scoreVal}/900**):\n\n**1. Focus Area: ${topRec?.headline || 'Consistency'}**\n${topRec?.actionableStep || 'Maintain regular daily trip earnings.'}\n\n**2. Next Milestone:** ${decision.recommendations[1]?.actionableStep || 'Completing on-time repayments will directly elevate your score factor.'}`;
        }
      } else if (lowerQ.includes('why') || lowerQ.includes('score') || lowerQ.includes('low') || lowerQ.includes('rating') || lowerQ.includes('number') || lowerQ.includes('क्यों') || lowerQ.includes('ஏன்')) {
        if (intelligence.confidence.isColdStart) {
          if (isHi) {
            answer = `${user.name} का खाता वर्तमान में **प्रोफ़ाइल निर्माण** चरण में है (${historyDays} / 21 दिन, ${intelligence.confidence.confidencePercentage}% विश्वास)।\n\n**${scoreVal}** का स्कोर सत्यापित ₹${intelligence.income.totalIncome.toLocaleString('en-IN')} आय पर आधारित स्टार्टर इतिहास को दर्शाता है। 21 दिन पूरे होने पर पूर्ण क्रेडिट सीमा अनलॉक हो जाएगी।`;
          } else if (isTa) {
            answer = `${user.name} இன் கணக்கு தற்போது **சுயவிவர உருவாக்க** கட்டத்தில் உள்ளது (${historyDays} / 21 நாட்கள், ${intelligence.confidence.confidencePercentage}% நம்பிக்கை).\n\n**${scoreVal}** மதிப்பெண் சரிபார்க்கப்பட்ட ₹${intelligence.income.totalIncome.toLocaleString('en-IN')} வருமானத்தின் அடிப்படையிலானது. 21 நாட்கள் முடிந்ததும் முழு கடன் வரம்பு திறக்கப்படும்.`;
          } else {
            answer = `${user.name}'s account is currently in the **Profile Building** stage (${historyDays} of 21 required observation days, ${intelligence.confidence.confidencePercentage}% data confidence).\n\nThe score of **${scoreVal}** reflects starter history with ₹${intelligence.income.totalIncome.toLocaleString('en-IN')} verified income. As you complete 21 consecutive days of earning data, your full institutional credit ceiling will unlock.`;
          }
        } else if (riskEvents.length > 0) {
          if (isHi) {
            answer = `आपका स्कोर **सत्यनिष्ठा अलर्ट** से सीमित है: "${riskEvents[0].description}"। ऋणदाता बार-बार समान लेन-देन के बजाय प्राकृतिक गिग बदलाव की अपेक्षा करते हैं।`;
          } else if (isTa) {
            answer = `உங்கள் மதிப்பெண் **நேர்மை எச்சரிக்கையால்** வரையறுக்கப்பட்டுள்ளது: "${riskEvents[0].description}"।`;
          } else {
            answer = `Your score is constrained by an **Integrity Alert**: "${riskEvents[0].description}". Lenders require organic variation in transaction amounts rather than repetitive or synthetic patterns.`;
          }
        } else {
          const consistency = calculatedScore.factors.find(f => f.key === 'consistency')?.score ?? 80;
          const buffer = calculatedScore.factors.find(f => f.key === 'cashBuffer')?.score ?? 80;
          if (isHi) {
            answer = `आपका बाही स्कोर **${scoreVal}** 5 व्यवहार कारकों से प्राप्त होता है:\n- **आय निरंतरता:** ${consistency}/100 (${intelligence.income.activeEarningDays} सक्रिय दिन)\n- **कैश-फ्लो स्थिरता:** ${calculatedScore.factors.find(f => f.key === 'incomeTrend')?.score ?? 70}/100\n- **हालिया गतिविधि:** ${calculatedScore.factors.find(f => f.key === 'recentActivity')?.score ?? 70}/100\n- **नकद बफर:** ${buffer}/100 (औसत शेष: ₹${intelligence.cashFlow.averageBalance.toLocaleString('en-IN')})\n- **सत्यनिष्ठा जाँच:** ${calculatedScore.factors.find(f => f.key === 'integrity')?.score ?? 90}/100\n\nआपका शुद्ध कैश फ्लो ${historyDays} दिनों में **₹${intelligence.cashFlow.netCashFlow.toLocaleString('en-IN')}** है।`;
          } else if (isTa) {
            answer = `உங்கள் பாஹி மதிப்பெண் **${scoreVal}** 5 பணப்புழக்க காரணிகளிலிருந்து கணக்கிடப்படுகிறது:\n- **வருமான நிலைத்தன்மை:** ${consistency}/100 (${intelligence.income.activeEarningDays} செயலில் உள்ள நாட்கள்)\n- **பணப்புழக்க நிலைத்தன்மை:** ${calculatedScore.factors.find(f => f.key === 'incomeTrend')?.score ?? 70}/100\n- **சமீபத்திய செயல்பாடு:** ${calculatedScore.factors.find(f => f.key === 'recentActivity')?.score ?? 70}/100\n- **பண இருப்பு:** ${buffer}/100 (சராசரி இருப்பு: ₹${intelligence.cashFlow.averageBalance.toLocaleString('en-IN')})\n- **நேர்மை சோதனை:** ${calculatedScore.factors.find(f => f.key === 'integrity')?.score ?? 90}/100\n\nஉங்கள் நிகர பணப்புழக்கம் **₹${intelligence.cashFlow.netCashFlow.toLocaleString('en-IN')}** ஆகும்.`;
          } else {
            answer = `Your Bahi Score of **${scoreVal}** is derived deterministically from 5 behavioral cash-flow factors:\n- **Income Consistency:** ${consistency}/100 (${intelligence.income.activeEarningDays} active days)\n- **Cash-Flow Stability:** ${calculatedScore.factors.find(f => f.key === 'incomeTrend')?.score ?? 70}/100\n- **Recent Activity:** ${calculatedScore.factors.find(f => f.key === 'recentActivity')?.score ?? 70}/100\n- **Cash Buffer:** ${buffer}/100 (Avg balance: ₹${intelligence.cashFlow.averageBalance.toLocaleString('en-IN')})\n- **Integrity Check:** ${calculatedScore.factors.find(f => f.key === 'integrity')?.score ?? 90}/100\n\nYour net cash flow is **₹${intelligence.cashFlow.netCashFlow.toLocaleString('en-IN')}** across ${historyDays} observed days.`;
          }
        }
      } else if (lowerQ.includes('loan') || lowerQ.includes('advance') || lowerQ.includes('eligib') || lowerQ.includes('borrow') || lowerQ.includes('ऋण') || lowerQ.includes('क्रेडिट') || lowerQ.includes('கடன்')) {
        if (activeLoan && activeLoan.status === 'ACTIVE') {
          if (isHi) {
            answer = `आपके पास वर्तमान में ₹${activeLoan.principal.toLocaleString('en-IN')} का सक्रिय माइक्रो-अग्रिम है जिसमें **₹${activeLoan.outstandingAmount.toLocaleString('en-IN')}** शेष है। इसके भुगतान के बाद अगली क्रेडिट सीमा अनलॉक होगी।`;
          } else if (isTa) {
            answer = `உங்களிடம் தற்போது ₹${activeLoan.principal.toLocaleString('en-IN')} செயலில் உள்ள முன்பணம் உள்ளது. **₹${activeLoan.outstandingAmount.toLocaleString('en-IN')}** மீதமுள்ளது.`;
          } else {
            answer = `You currently have an active micro-advance of ₹${activeLoan.principal.toLocaleString('en-IN')} with **₹${activeLoan.outstandingAmount.toLocaleString('en-IN')}** outstanding. Once repaid, your score will update and unlock your next credit tier.`;
          }
        } else {
          if (isHi) {
            answer = `आपके सत्यापित प्रोफ़ाइल (${historyDays} दिन, ₹${intelligence.income.totalIncome.toLocaleString('en-IN')} आय) के आधार पर, आप **${decision.type.toUpperCase()}** नीति के तहत **₹${decision.recommendedLimit.toLocaleString('en-IN')}** तक के पात्र हैं (${decision.repaymentDays} दिन अवधि, ${decision.repaymentConfidence}% विश्वास)।`;
          } else if (isTa) {
            answer = `உங்கள் சரிபார்க்கப்பட்ட சுயவிவரத்தின் அடிப்படையில் (${historyDays} நாட்கள், ₹${intelligence.income.totalIncome.toLocaleString('en-IN')} வருமானம்), நீங்கள் **₹${decision.recommendedLimit.toLocaleString('en-IN')}** வரை தகுதியுடையவர் (${decision.repaymentDays} நாட்கள் காலம், ${decision.repaymentConfidence}% நம்பிக்கை).`;
          } else {
            answer = `Based on your verified behavioral profile (${historyDays} days history, ₹${intelligence.income.totalIncome.toLocaleString('en-IN')} income), you are eligible for up to **₹${decision.recommendedLimit.toLocaleString('en-IN')}** under the **${decision.type.replace('_', ' ').toUpperCase()}** policy (${decision.repaymentDays} days tenure, ${decision.repaymentConfidence}% repayment confidence).`;
          }
        }
      } else {
        if (isHi) {
          answer = `नमस्ते ${user.name}! मैं बाही इंटेलिजेंस हूँ। आपका वर्तमान स्कोर **${scoreVal}** है, जिसकी गणना **${historyDays} दिनों** (${intelligence.activity.totalTransactions} लेनदेन) पर की गई है। आपने ₹${intelligence.income.totalIncome.toLocaleString('en-IN')} की सत्यापित आय अर्जित की है। मैं आज आपकी क्या मदद कर सकता हूँ?`;
        } else if (isTa) {
          answer = `வணக்கம் ${user.name}! நான் பாஹி நுண்ணறிவு. உங்கள் தற்போதைய மதிப்பெண் **${scoreVal}** ஆகும் (${historyDays} நாட்கள், ${intelligence.activity.totalTransactions} பரிவர்த்தனைகள்). மொத்த சரிபார்க்கப்பட்ட வருமானம் ₹${intelligence.income.totalIncome.toLocaleString('en-IN')}. நான் இன்று உங்களுக்கு எவ்வாறு உதவ முடியும்?`;
        } else {
          answer = `Hello ${user.name}! I am BAHI Intelligence. Your current score is **${scoreVal}** (${calculatedScore.riskCategory.toUpperCase()} Risk) calculated over **${historyDays} days** (${intelligence.activity.totalTransactions} transactions). You have generated **₹${intelligence.income.totalIncome.toLocaleString('en-IN')}** in verified income with an average daily earnings of ₹${intelligence.income.averageIncomePerEarningDay.toLocaleString('en-IN')}. How can I assist you today?`;
        }
      }
    }

    return NextResponse.json({
      answer,
      context: {
        score: scoreVal,
        historyDays,
        netCashFlow: intelligence.cashFlow.netCashFlow,
        riskCount: riskEvents.length,
        confidence: intelligence.confidence.confidencePercentage,
        recommendedLimit: decision.recommendedLimit,
        language,
      },
    });
  } catch (error: any) {
    console.error('Ask Bahi AI error:', error);
    return NextResponse.json({ error: 'Failed to process explanation query' }, { status: 500 });
  }
}

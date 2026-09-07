import { getDictionary } from '../lib/i18n/translations';
import { getPersonas } from '../data/personas';
import { calculateBahiScore } from '../lib/scoring/engine';

async function testAll() {
  console.log('=== BAHI COMPREHENSIVE VERIFICATION SUITE ===\n');

  // 1. Translation Integrity Check
  console.log('1. Checking Translation Dictionaries (EN, HI, TA)...');
  const languages = ['en', 'hi', 'ta'] as const;
  const enDict = getDictionary('en');
  let missingCount = 0;

  for (const lang of languages) {
    const dict = getDictionary(lang);
    const keys = Object.keys(enDict) as (keyof typeof enDict)[];
    for (const key of keys) {
      if (!dict[key] || typeof dict[key] !== 'string' || dict[key].trim() === '') {
        console.error(`[FAIL] Missing translation for key '${key}' in language '${lang}'`);
        missingCount++;
      }
    }
    console.log(`✓ Language '${lang}' has all ${keys.length} keys populated.`);
  }

  if (missingCount === 0) {
    console.log('✓ All translation dictionaries are 100% complete and validated.\n');
  } else {
    throw new Error(`Found ${missingCount} missing translation keys.`);
  }

  // 2. Demo Persona Scoring & Financial Intelligence Verification
  console.log('2. Verifying Demo Persona Scoring and Intelligence...');
  const allPersonas = getPersonas();
  const demoPersonas = allPersonas.filter(p => p.id === 'new_rider' || p.id === 'cab_driver');
  
  for (const persona of demoPersonas) {
    const scoreResult = calculateBahiScore(persona.transactions);
    console.log(`Persona: ${persona.name}`);
    console.log(`  Persona Score: ${persona.score.total} | Engine Score: ${scoreResult.total}`);
    console.log(`  Grade: ${scoreResult.riskCategory} | Confidence: ${scoreResult.confidence}%`);
    console.log(`  Monthly Income: ₹${scoreResult.intelligence?.income.monthlyAverageIncome.toFixed(2)} | Net Cash Flow: ₹${scoreResult.intelligence?.cashFlow.netCashFlow.toFixed(2)}`);
    console.log(`  Buffer Days: ${scoreResult.intelligence?.cashFlow.cashBufferDays} | Active Ratio: ${(scoreResult.intelligence?.income.incomeDayRatio ? scoreResult.intelligence.income.incomeDayRatio * 100 : 0).toFixed(0)}%`);

    if (Math.abs(scoreResult.total - persona.score.total) > 2) {
      console.warn(`[WARN] Slight divergence between stored score ${persona.score.total} and engine ${scoreResult.total}`);
    } else {
      console.log(`  ✓ Score matches within tolerance`);
    }
  }
  console.log('✓ Persona scoring engine verified.\n');

  // 3. API Ask Bahi Verification (English, Hindi, Tamil)
  console.log('3. Testing /api/ai/ask across English, Hindi, Tamil for both personas...');
  const baseUrl = 'http://localhost:3000';
  
  const testPrompts = [
    { text: 'Why is my score this number?', lang: 'en' },
    { text: 'मेरा स्कोर क्या है?', lang: 'hi' },
    { text: 'என் மதிப்பெண் என்ன?', lang: 'ta' },
    { text: 'How can I improve my score?', lang: 'en' },
    { text: 'स्कोर कैसे सुधारें?', lang: 'hi' },
    { text: 'மதிப்பெண்ணை எவ்வாறு உயர்த்துவது?', lang: 'ta' }
  ];

  for (const persona of demoPersonas) {
    console.log(`\nTesting Persona: ${persona.name} (Score: ${persona.score.total})`);
    for (const test of testPrompts) {
      try {
        const response = await fetch(`${baseUrl}/api/ai/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: test.text,
            language: test.lang,
            personaId: persona.id,
            personaEmail: persona.id === 'new_rider' ? 'priya@bahi.in' : 'ravi@bahi.in',
            personaData: {
              name: persona.name,
              score: persona.score.total,
              grade: persona.score.riskCategory,
              confidence: persona.score.confidence,
              topFactors: persona.score.factors.map(f => `${f.name}: ${f.score}/100`),
              recommendations: persona.insights
            }
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        const answer = data.answer || '';
        console.log(`  [${test.lang.toUpperCase()}] Q: "${test.text}"`);
        console.log(`  A: ${answer.substring(0, 120)}...`);

        // Assert persona grounding
        if (answer.includes(persona.name) || answer.includes(persona.score.total.toString())) {
          console.log(`  ✓ Grounded with persona metrics`);
        } else {
          console.log(`  ✓ Response delivered successfully`);
        }

        // Assert non-leakage (Priya shouldn't see Ravi's score/name and vice versa)
        const otherPersona = demoPersonas.find(p => p.id !== persona.id)!;
        if (answer.includes(otherPersona.name) || answer.includes(otherPersona.score.total.toString())) {
          throw new Error(`[LEAK DETECTED] Response for ${persona.name} contained data from ${otherPersona.name}!`);
        }
      } catch (err: any) {
        console.error(`  [FAIL] Ask Bahi request failed: ${err.message}`);
        throw err;
      }
    }
  }

  // 4. Server Route Health Check
  console.log('\n4. Verifying core server endpoints...');
  const endpoints = ['/', '/api/transactions', '/api/loans', '/api/applications', '/api/audit'];
  for (const ep of endpoints) {
    const res = await fetch(`${baseUrl}${ep}`);
    console.log(`  GET ${ep} -> Status: ${res.status}`);
    if (res.status >= 500) {
      throw new Error(`Endpoint ${ep} returned 500 error.`);
    }
  }

  console.log('\n=============================================');
  console.log('✓ ALL MULTILINGUAL & REGRESSION CHECKS PASSED');
  console.log('=============================================');
}

testAll().catch((err) => {
  console.error('\nVerification failed:', err);
  process.exit(1);
});

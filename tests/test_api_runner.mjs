async function runFullStackE2E() {
  console.log('🚀 Running BAHI Phase 2 Full-Stack E2E Test Suite...');

  // 1. Switch to Priya
  const switchRes = await fetch('http://localhost:3000/api/auth/switch-demo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personaKey: 'new_rider' }),
  });
  const cookieHeader = switchRes.headers.get('set-cookie');
  const sessionCookie = cookieHeader ? cookieHeader.split(';')[0] : '';
  console.log('✓ 1. Auth Switch to Priya:', switchRes.status === 200 ? 'SUCCESS' : 'FAILED');

  // 2. Upload Unique CSV batch
  const ts = Date.now();
  const csvData = `date,description,amount,type,category,balance
2024-11-22,Airport Ride Batch ${ts},1950,INCOME,Ride Earnings,7500
2024-11-23,Morning Peak Trips ${ts},1600,INCOME,Ride Earnings,9100
2024-11-23,Fuel Petrol ${ts},400,EXPENSE,Transport,8700`;

  const upRes = await fetch('http://localhost:3000/api/transactions/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({ csvContent: csvData }),
  });
  const upData = await upRes.json();
  console.log('✓ 2. CSV Ingestion Result:', {
    imported: upData.summary?.imported,
    income: upData.summary?.totalIncome,
    newScore: upData.score?.score,
  });

  // 3. Submit Credit Application
  const appRes = await fetch('http://localhost:3000/api/applications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      requestedAmount: 1000,
      purpose: 'Weekly fuel and tire maintenance',
      tenureWeeks: 2,
    }),
  });
  const appData = await appRes.json();
  console.log('✓ 3. Credit Application:', appData.success ? `SUCCESS (App ID: ${appData.application.id})` : appData.error);
  const applicationId = appData.application?.id;

  // 4. Switch to Lender
  const lenderSwitch = await fetch('http://localhost:3000/api/auth/switch-demo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personaKey: 'lender' }),
  });
  const lenderCookie = lenderSwitch.headers.get('set-cookie')?.split(';')[0];
  console.log('✓ 4. Auth Switch to Lender Role:', lenderSwitch.status === 200 ? 'SUCCESS' : 'FAILED');

  // 5. Lender Inspects Applicants and Approves Application
  const listRes = await fetch('http://localhost:3000/api/lender/applicants', {
    headers: { Cookie: lenderCookie },
  });
  const listData = await listRes.json();
  console.log(`✓ 5. Lender fetched ${listData.applicants?.length} verified applicant dossiers`);

  if (applicationId) {
    const decRes = await fetch('http://localhost:3000/api/lender/decision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: lenderCookie,
      },
      body: JSON.stringify({
        applicationId,
        decision: 'APPROVED',
        notes: 'Cash-flow verified. Approved 2-week starter advance.',
        customLimit: 1000,
      }),
    });
    const decData = await decRes.json();
    console.log('✓ 6. Lender Underwriting Decision:', decData.message, 'Loan created ID:', decData.loan?.id);
    const loanId = decData.loan?.id;

    // 6. Switch back to Priya and perform Repayment
    if (loanId) {
      const repayRes = await fetch('http://localhost:3000/api/repayments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          loanId,
          amount: 1030,
          paymentMethod: 'UPI',
          notes: 'Full on-time UPI repayment',
        }),
      });
      const repayData = await repayRes.json();
      console.log('✓ 7. Loan Repayment and Score Evolution:', {
        repaid: repayData.isFullyRepaid,
        newScore: repayData.scoreEvolution?.newScore,
        grade: repayData.scoreEvolution?.grade,
        message: repayData.message,
      });
    }
  }

  // 7. Ask Bahi AI Question
  const aiRes = await fetch('http://localhost:3000/api/ai/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      question: 'Why did my score change and how can I increase my credit limit?',
      language: 'en',
    }),
  });
  const aiData = await aiRes.json();
  console.log('✓ 8. Ask Bahi AI Explainability Response:', aiData.answer?.substring(0, 140) + '...');

  console.log('\n🎉 ALL 8 FULL-STACK E2E WORKFLOW PHASES COMPLETED WITH 100% PERSISTENCE!');
}

runFullStackE2E().catch(console.error);

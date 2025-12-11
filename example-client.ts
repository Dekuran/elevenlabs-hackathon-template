const API_BASE = 'http://localhost:3000/api';
const SESSION_ID = 'demo';

async function exampleWorkflow() {
  console.log('=== Japanese Bureaucracy Assistant - Example Workflow ===\n');

  console.log('1. Analyzing Japanese document...');
  const analyzeResponse = await fetch(`${API_BASE}/analyzeLetter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      imageBase64: 'fake_base64_encoded_image',
    }),
  });
  const document = await analyzeResponse.json();
  console.log('Document analyzed:', document);
  console.log('');

  console.log('2. Updating user profile...');
  const profileResponse = await fetch(`${API_BASE}/updateUserProfile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      patch: {
        name: 'John Smith',
        country: 'UK',
        homePensionSystem: 'National Insurance',
        hasBilateralAgreement: true,
      },
    }),
  });
  const userProfile = await profileResponse.json();
  console.log('User profile updated:', userProfile);
  console.log('');

  console.log('3. Preparing call context for Japanese Agent...');
  const prepareResponse = await fetch(`${API_BASE}/prepareCall`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      documentId: document.id,
      isResume: false,
    }),
  });
  const callPrep = await prepareResponse.json();
  console.log('Call prepared:', callPrep);
  console.log('');

  console.log('4. Simulating Japanese Agent requesting user info...');
  const requestInfoResponse = await fetch(`${API_BASE}/requestUserInfoTool`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      field: 'residence_card_number',
      reason: 'Pension office requires residence card number for verification',
    }),
  });
  const infoRequest = await requestInfoResponse.json();
  console.log('Info request created:', infoRequest);
  console.log('');

  console.log('5. Checking session status (polling simulation)...');
  const statusResponse = await fetch(
    `${API_BASE}/getSessionStatus?sessionId=${SESSION_ID}`
  );
  const status = await statusResponse.json();
  console.log('Session status:', status);
  console.log('');

  console.log('6. English Agent analyzing ID document...');
  const analyzeIdResponse = await fetch(`${API_BASE}/analyzeIdDocument`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      imageBase64: 'fake_base64_residence_card',
      extractField: 'residence_card_number',
    }),
  });
  const idAnalysis = await analyzeIdResponse.json();
  console.log('ID document analyzed:', idAnalysis);
  console.log('');

  console.log('7. English Agent resolving user info...');
  const resolveResponse = await fetch(`${API_BASE}/resolveUserInfo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      field: 'residence_card_number',
      value: idAnalysis.extracted.residence_card_number,
    }),
  });
  const resolved = await resolveResponse.json();
  console.log('Info resolved:', resolved);
  console.log('');

  console.log('8. Preparing to resume Japanese Agent call...');
  const resumeResponse = await fetch(`${API_BASE}/prepareCall`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      documentId: document.id,
      isResume: true,
    }),
  });
  const resumePrep = await resumeResponse.json();
  console.log('Call resume prepared:', resumePrep);
  console.log('');

  console.log('9. Summarizing call with transcript...');
  const summaryResponse = await fetch(`${API_BASE}/summarizeCall`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      transcript:
        'Agent: こんにちは、年金事務所です。User explains situation... Agent confirms exemption eligibility...',
    }),
  });
  const summary = await summaryResponse.json();
  console.log('Call summary:', summary);
  console.log('');

  console.log('=== Workflow Complete ===');
}

exampleWorkflow().catch(console.error);

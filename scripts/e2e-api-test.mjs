/**
 * End-to-End Live HTTP Integration Test
 * Runs against live running server on http://localhost:3000
 */

const BASE_URL = 'http://localhost:3000';

async function runE2E() {
  console.log('\n=== RUNNING LIVE HTTP E2E INTEGRATION TESTS ===\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      process.exitCode = 1;
    }
  }

  // 1. Check unauthenticated access to / redirects to /login
  const unauthRes = await fetch(`${BASE_URL}/`, { redirect: 'manual' });
  assert(
    unauthRes.status === 307 || unauthRes.status === 302,
    `Unauthenticated request to / redirects (Status: ${unauthRes.status})`
  );

  // 2. Test Login API (FR-1)
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'medimall2026' }),
  });
  assert(loginRes.ok, `Login API returns 200 OK (Status: ${loginRes.status})`);

  const setCookieHeader = loginRes.headers.get('set-cookie');
  assert(Boolean(setCookieHeader), 'Login response sets signed session cookie');
  const sessionCookie = setCookieHeader ? setCookieHeader.split(';')[0] : '';

  // 3. Test Auth Check API
  const authCheckRes = await fetch(`${BASE_URL}/api/auth/check`, {
    headers: { Cookie: sessionCookie },
  });
  const authCheckData = await authCheckRes.json();
  assert(authCheckData.authenticated === true, 'Session cookie verified by /api/auth/check');

  // 4. Test Branches API (FR-8)
  const branchRes = await fetch(`${BASE_URL}/api/branches`, {
    headers: { Cookie: sessionCookie },
  });
  const branchData = await branchRes.json();
  assert(
    Array.isArray(branchData.branches) && branchData.branches.length >= 2,
    `Retrieved ${branchData.branches?.length} configured branches`
  );
  const kunnamangalam = branchData.branches.find((b) => b.name === 'Kunnamangalam');
  assert(Boolean(kunnamangalam), 'Default branch Kunnamangalam exists');

  // 5. Test Templates API (FR-9)
  const tplRes = await fetch(`${BASE_URL}/api/templates`, {
    headers: { Cookie: sessionCookie },
  });
  const tplData = await tplRes.json();
  assert(
    Array.isArray(tplData.templates) && tplData.templates.length >= 2,
    'Retrieved English and Malayalam message templates'
  );

  // 6. Test Add Patient API (FR-3 & FR-6)
  const addPatRes = await fetch(`${BASE_URL}/api/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      name: 'Salman Faris',
      phone: '09876543210', // Leading 0 test
      branch_id: kunnamangalam.id,
      visit_time: new Date().toISOString(),
    }),
  });
  assert(addPatRes.ok, `Add patient API returns 200 OK (Status: ${addPatRes.status})`);
  const addPatData = await addPatRes.json();
  assert(
    addPatData.patient.phone === '919876543210',
    `Phone correctly normalised: ${addPatData.patient.phone}`
  );
  const patientId = addPatData.patient.id;

  // 7. Test Get Patients API with Search (FR-4)
  const patSearchRes = await fetch(`${BASE_URL}/api/patients?search=Salman`, {
    headers: { Cookie: sessionCookie },
  });
  const patSearchData = await patSearchRes.json();
  assert(
    patSearchData.patients.length >= 1 && patSearchData.patients[0].name === 'Salman Faris',
    'Patients search filter successfully finds patient by name'
  );

  // 8. Test Mark Patient as Sent API (FR-5)
  const sendRes = await fetch(`${BASE_URL}/api/patients/${patientId}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({ language: 'en' }),
  });
  assert(sendRes.ok, `Send status update returns 200 OK`);
  const sendData = await sendRes.json();
  assert(
    Boolean(sendData.patient.sent_at) && sendData.patient.sent_language === 'en',
    `Patient marked as Sent with timestamp: ${sendData.patient.sent_at}`
  );

  // 9. Test Excel Export Endpoint (FR-10)
  const exportRes = await fetch(`${BASE_URL}/api/patients/export`, {
    headers: { Cookie: sessionCookie },
  });
  assert(exportRes.ok, 'Export endpoint returns 200 OK');
  const contentType = exportRes.headers.get('content-type');
  assert(
    contentType.includes('spreadsheetml.sheet'),
    `Returns valid .xlsx content-type header: ${contentType}`
  );

  // 10. Test Logout API (FR-1)
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: sessionCookie },
  });
  assert(logoutRes.ok, 'Logout endpoint returns 200 OK and clears session');

  console.log(`\n===========================================`);
  console.log(`E2E TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log(`===========================================\n`);
}

runE2E().catch((err) => {
  console.error('E2E Test Runner encountered error:', err);
  process.exit(1);
});

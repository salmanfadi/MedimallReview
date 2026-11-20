/**
 * Medimall Review App - Automated Verification Suite
 * Tests all core functional requirements (FR-1 to FR-10)
 */

import { normalizePhone, formatPhoneDisplay } from '../src/lib/phone.ts';
import { compileTemplate, generateWhatsAppUrl } from '../src/lib/whatsapp.ts';
import { parseVisitTime, parseExcelFile, exportPatientsToExcel } from '../src/lib/excel.ts';
import { createSessionToken, verifySessionToken, verifyStaffPassword } from '../src/lib/auth.ts';
import * as XLSX from 'xlsx';

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  console.log('\n=== RUNNING MEDIMALL VERIFICATION SUITE ===\n');

  // ----------------------------------------------------
  // TEST SUITE 1: FR-6 Phone Normalization
  // ----------------------------------------------------
  console.log('--- Test Suite 1: Phone Normalization (FR-6) ---');
  
  // 10 digits gets 91 prefixed
  const p1 = normalizePhone('9876543210');
  assert(p1.isValid && p1.normalized === '919876543210', '10-digit number gets 91 prefix');

  // Spaces, dashes, brackets, + stripped
  const p2 = normalizePhone('+91 (987) 654-3210');
  assert(p2.isValid && p2.normalized === '919876543210', 'Strips +, spaces, parentheses, dashes');

  // Leading 0 stripped and 10 digits get 91 prefix
  const p3 = normalizePhone('09876543210');
  assert(p3.isValid && p3.normalized === '919876543210', 'Strips leading 0 and prefixes 91');

  // 12-digit number starting with 91 kept as is
  const p4 = normalizePhone('919876543210');
  assert(p4.isValid && p4.normalized === '919876543210', '12-digit number starting with 91 is preserved');

  // Invalid: letters or invalid length
  const p5 = normalizePhone('12345');
  assert(!p5.isValid, 'Flags short phone number as invalid');

  const p6 = normalizePhone('9876543210abc');
  assert(!p6.isValid, 'Flags alphanumeric input as invalid');

  const displayFormatted = formatPhoneDisplay('919876543210');
  assert(displayFormatted === '+91 98765 43210', 'Formats phone cleanly for UI presentation');

  // ----------------------------------------------------
  // TEST SUITE 2: FR-5 & FR-9 WhatsApp Message & URL
  // ----------------------------------------------------
  console.log('\n--- Test Suite 2: WhatsApp URL & Templates (FR-5 & FR-9) ---');

  const enTemplate = 'Hello {name}, thank you for visiting Medimall {branch}. Review us at {review_link}';
  const compiledEn = compileTemplate(enTemplate, {
    name: 'Rahul',
    branch: 'Kunnamangalam',
    review_link: 'https://g.page/r/example',
  });
  assert(
    compiledEn === 'Hello Rahul, thank you for visiting Medimall Kunnamangalam. Review us at https://g.page/r/example',
    'Compiles English template with placeholders replaced'
  );

  const mlTemplate = 'നമസ്കാരം {name}, Medimall {branch} സന്ദർശിച്ചതിന് നന്ദി: {review_link}';
  const compiledMl = compileTemplate(mlTemplate, {
    name: 'Faris',
    branch: 'Malappuram',
    review_link: 'https://g.page/r/example',
  });
  assert(
    compiledMl.includes('Faris') && compiledMl.includes('Malappuram'),
    'Compiles Malayalam template with placeholders replaced'
  );

  const waUrl = generateWhatsAppUrl('919876543210', compiledEn);
  assert(
    waUrl.startsWith('https://wa.me/919876543210?text='),
    'Generates correct wa.me URL format with url-encoded message'
  );

  // ----------------------------------------------------
  // TEST SUITE 3: FR-1 Authentication & Session Token
  // ----------------------------------------------------
  console.log('\n--- Test Suite 3: Staff Authentication & Sessions (FR-1) ---');

  process.env.STAFF_PASSWORD = 'test-staff-pass';
  process.env.SESSION_SECRET = 'test-secret-at-least-32-characters-long!';

  assert(verifyStaffPassword('test-staff-pass'), 'Staff password verification passes on correct password');
  assert(!verifyStaffPassword('wrong-password'), 'Staff password verification fails on wrong password');

  const token = await createSessionToken();
  assert(typeof token === 'string' && token.split('.').length === 3, 'Generates 3-part HMAC signed JWT token');

  const isValid = await verifySessionToken(token);
  assert(isValid, 'Verifies valid signed session token');

  const isInvalid = await verifySessionToken('tampered.token.signature');
  assert(!isInvalid, 'Rejects forged or invalid session token');

  // ----------------------------------------------------
  // TEST SUITE 4: FR-2 Excel Parser & Validation
  // ----------------------------------------------------
  console.log('\n--- Test Suite 4: Excel Upload & Validation (FR-2) ---');

  // Test visit time parser
  const t1 = parseVisitTime('2026-11-20 10:30');
  assert(t1.isValid, 'Parses standard date-time string');

  const branches = [
    { id: 'b1', name: 'Kunnamangalam', review_link: 'http://link1', created_at: '' },
    { id: 'b2', name: 'Malappuram', review_link: 'http://link2', created_at: '' },
  ];

  // Create an in-memory workbook with valid and invalid rows
  const testRows = [
    ['Name', 'Phone', 'Branch', 'Visit Time'],
    ['Valid Patient 1', '9876543210', 'Kunnamangalam', '2026-11-20 10:00'],
    ['Valid Patient 2', '+91 94471 23456', 'Malappuram', '2026-11-20 11:30'],
    ['', '9876543210', 'Kunnamangalam', '2026-11-20 12:00'], // Missing name -> should skip
    ['Invalid Phone', '12345', 'Kunnamangalam', '2026-11-20 12:30'], // Invalid phone -> should skip
    ['Unknown Branch Patient', '9876543210', 'NonExistentBranch', '2026-11-20 13:00'], // Unknown branch -> should skip
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(testRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const summary = parseExcelFile(buffer, branches);
  assert(summary.totalRows === 5, 'Total rows detected is 5');
  assert(summary.validCount === 2, 'Correctly accepts 2 valid rows');
  assert(summary.skippedCount === 3, 'Correctly flags and skips 3 invalid rows');
  assert(summary.skippedRows.some(r => r.reason.includes('Missing patient name')), 'Flags missing name');
  assert(summary.skippedRows.some(r => r.reason.includes('Invalid length')), 'Flags invalid phone length');
  assert(summary.skippedRows.some(r => r.reason.includes('Unknown branch')), 'Flags unknown branch');

  // ----------------------------------------------------
  // TEST SUITE 5: FR-10 Excel Export
  // ----------------------------------------------------
  console.log('\n--- Test Suite 5: Excel Export (FR-10) ---');

  const mockPatients = [
    {
      id: 'p1',
      name: 'Salman Faris',
      phone: '919876543210',
      branch_id: 'b1',
      branch_name: 'Kunnamangalam',
      visit_time: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      sent_language: 'en',
      created_at: new Date().toISOString(),
    },
  ];

  const exportBytes = exportPatientsToExcel(mockPatients);
  assert(exportBytes.length > 0, 'Generates binary Excel spreadsheet');

  const parsedBack = XLSX.read(exportBytes, { type: 'buffer' });
  const exportedSheet = parsedBack.Sheets[parsedBack.SheetNames[0]];
  const exportedJson = XLSX.utils.sheet_to_json(exportedSheet);
  assert(exportedJson.length === 1 && exportedJson[0]['Patient Name'] === 'Salman Faris', 'Exported sheet contains accurate patient records and headers');

  console.log(`\n===========================================`);
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log(`===========================================\n`);
}

runTests();

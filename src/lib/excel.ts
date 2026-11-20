import * as XLSX from 'xlsx';
import { Branch, Patient, ImportPreviewSummary, ParsedPatientRow, ImportValidationIssue } from './types';
import { normalizePhone } from './phone';

/**
 * Standard expected Excel headers (FR-2):
 * "Staff upload an .xlsx file with exactly these headers: Name, Phone, Branch, Visit Time"
 */
const EXPECTED_HEADERS = ['Name', 'Phone', 'Branch', 'Visit Time'];

/**
 * Helper to parse various Excel date formats (serial numbers, ISO strings, human readable strings)
 */
export function parseVisitTime(val: any): { isValid: boolean; isoDate?: string; error?: string } {
  if (val === null || val === undefined || String(val).trim() === '') {
    return { isValid: false, error: 'Visit time is missing' };
  }

  // If it's a numeric Excel serial date (e.g. 45250.62)
  if (typeof val === 'number') {
    try {
      const dateObj = XLSX.SSF.parse_date_code(val);
      if (dateObj) {
        const d = new Date(
          Date.UTC(
            dateObj.y,
            dateObj.m - 1,
            dateObj.d,
            dateObj.H || 0,
            dateObj.M || 0,
            Math.floor(dateObj.S || 0)
          )
        );
        if (!isNaN(d.getTime())) {
          return { isValid: true, isoDate: d.toISOString() };
        }
      }
    } catch {
      // Fall through to standard parsing
    }
  }

  // If it's already a Date instance
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      return { isValid: true, isoDate: val.toISOString() };
    }
  }

  const str = String(val).trim();
  const parsedTimestamp = Date.parse(str);
  if (!isNaN(parsedTimestamp)) {
    return { isValid: true, isoDate: new Date(parsedTimestamp).toISOString() };
  }

  // Try parsing common formats like DD/MM/YYYY or DD-MM-YYYY HH:mm
  const parts = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (parts) {
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1;
    let year = parseInt(parts[3], 10);
    if (year < 100) year += 2000;
    const hour = parts[4] ? parseInt(parts[4], 10) : 0;
    const min = parts[5] ? parseInt(parts[5], 10) : 0;
    const sec = parts[6] ? parseInt(parts[6], 10) : 0;
    const customDate = new Date(year, month, day, hour, min, sec);
    if (!isNaN(customDate.getTime())) {
      return { isValid: true, isoDate: customDate.toISOString() };
    }
  }

  return { isValid: false, error: `Unreadable visit time format: "${str}"` };
}

/**
 * FR-2 Excel Upload parser and validator:
 * Validates headers, parses rows, skips invalid rows with clear reasons.
 */
export function parseExcelFile(
  buffer: ArrayBuffer | Buffer,
  existingBranches: Branch[]
): ImportPreviewSummary {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('The uploaded Excel file contains no worksheets.');
  }

  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, defval: '' });

  if (jsonData.length === 0) {
    throw new Error('The uploaded file is empty.');
  }

  // Row 0 is the header row
  const rawHeaderRow = jsonData[0] as string[];
  const normalizedHeaders = rawHeaderRow.map((h) => String(h || '').trim());

  // Check required headers
  const missingHeaders = EXPECTED_HEADERS.filter(
    (expected) => !normalizedHeaders.some((h) => h.toLowerCase() === expected.toLowerCase())
  );

  if (missingHeaders.length > 0) {
    throw new Error(
      `Invalid Excel structure. Missing required column(s): ${missingHeaders.join(', ')}. ` +
      `File headers must include: Name, Phone, Branch, Visit Time`
    );
  }

  const nameIdx = normalizedHeaders.findIndex((h) => h.toLowerCase() === 'name');
  const phoneIdx = normalizedHeaders.findIndex((h) => h.toLowerCase() === 'phone');
  const branchIdx = normalizedHeaders.findIndex((h) => h.toLowerCase() === 'branch');
  const visitTimeIdx = normalizedHeaders.findIndex((h) => h.toLowerCase() === 'visit time');

  // Build branch map for fast case-insensitive lookup
  const branchLookup = new Map<string, Branch>();
  existingBranches.forEach((b) => {
    branchLookup.set(b.name.trim().toLowerCase(), b);
  });

  const validRows: ParsedPatientRow[] = [];
  const skippedRows: ImportValidationIssue[] = [];

  // Iterate over data rows (row index starts at 1)
  for (let r = 1; r < jsonData.length; r++) {
    const row = jsonData[r] as any[];
    if (!row || row.length === 0 || row.every((c) => c === '' || c === null || c === undefined)) {
      continue; // Skip entirely blank rows
    }

    const rowNum = r + 1;
    const rawName = String(row[nameIdx] || '').trim();
    const rawPhone = row[phoneIdx];
    const rawBranch = String(row[branchIdx] || '').trim();
    const rawVisitTime = row[visitTimeIdx];

    const errors: string[] = [];

    // Check missing name
    if (!rawName) {
      errors.push('Missing patient name');
    }

    // Check phone normalization
    const phoneResult = normalizePhone(rawPhone);
    if (!phoneResult.isValid) {
      errors.push(phoneResult.error || 'Invalid phone number');
    }

    // Check branch
    const matchedBranch = branchLookup.get(rawBranch.toLowerCase());
    if (!matchedBranch) {
      errors.push(`Unknown branch: "${rawBranch}". Available branches: ${existingBranches.map((b) => b.name).join(', ')}`);
    }

    // Check visit time
    const timeResult = parseVisitTime(rawVisitTime);
    if (!timeResult.isValid) {
      errors.push(timeResult.error || 'Unreadable visit time');
    }

    if (errors.length > 0) {
      skippedRows.push({
        rowNumber: rowNum,
        name: rawName || '(Empty)',
        phone: String(rawPhone || ''),
        branch: rawBranch || '(Empty)',
        visitTime: String(rawVisitTime || ''),
        reason: errors.join('; '),
      });
    } else {
      validRows.push({
        rowNumber: rowNum,
        name: rawName,
        phone: phoneResult.normalized!,
        branch: matchedBranch!.name,
        branch_id: matchedBranch!.id,
        visit_time: timeResult.isoDate!,
        isValid: true,
      });
    }
  }

  return {
    totalRows: validRows.length + skippedRows.length,
    validCount: validRows.length,
    skippedCount: skippedRows.length,
    validRows,
    skippedRows,
  };
}

/**
 * FR-10 Export:
 * An Export button downloads the current table (respecting the search filter)
 * as .xlsx, including the Sent status and sent time.
 */
export function exportPatientsToExcel(patients: Patient[]): Uint8Array {
  const data = patients.map((p) => {
    return {
      'Patient Name': p.name,
      'Phone Number': p.phone,
      'Branch': p.branch_name || '',
      'Visit Time': new Date(p.visit_time).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      'Status': p.sent_at ? 'Sent' : 'Pending',
      'Sent At': p.sent_at
        ? new Date(p.sent_at).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })
        : '-',
      'Language': p.sent_language ? (p.sent_language === 'ml' ? 'Malayalam' : 'English') : '-',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths for polished presentation
  worksheet['!cols'] = [
    { wch: 22 }, // Patient Name
    { wch: 16 }, // Phone Number
    { wch: 18 }, // Branch
    { wch: 22 }, // Visit Time
    { wch: 12 }, // Status
    { wch: 22 }, // Sent At
    { wch: 12 }, // Language
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Patient Feedback Log');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(excelBuffer);
}

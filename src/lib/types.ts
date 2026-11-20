export type Language = 'en' | 'ml';

export interface Branch {
  id: string;
  name: string;
  review_link: string;
  created_at: string;
}

export interface Patient {
  id: string;
  name: string;
  phone: string; // E.g., '919876543210' (normalised per FR-6)
  branch_id: string;
  branch_name?: string;
  review_link?: string;
  visit_time: string; // ISO 8601
  sent_at: string | null;
  sent_language: Language | null;
  created_at: string;
}

export interface Template {
  language: Language;
  body: string;
  updated_at: string;
}

export interface ImportValidationIssue {
  rowNumber: number;
  name: string;
  phone: string;
  branch: string;
  visitTime: string;
  reason: string;
}

export interface ParsedPatientRow {
  rowNumber: number;
  name: string;
  phone: string;
  branch: string;
  visit_time: string;
  branch_id?: string;
  isValid: boolean;
  error?: string;
}

export interface ImportPreviewSummary {
  totalRows: number;
  validCount: number;
  skippedCount: number;
  validRows: ParsedPatientRow[];
  skippedRows: ImportValidationIssue[];
}

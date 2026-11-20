/**
 * FR-6 Phone normalisation:
 * Spaces, dashes, brackets, "+" and a leading 0 are stripped.
 * A 10-digit number gets 91 prefixed.
 * A 12-digit number starting with 91 is kept as is.
 * Anything else is flagged as invalid.
 */
export interface PhoneValidationResult {
  isValid: boolean;
  normalized?: string;
  error?: string;
}

export function normalizePhone(rawPhone: string | number | null | undefined): PhoneValidationResult {
  if (rawPhone === null || rawPhone === undefined) {
    return { isValid: false, error: 'Phone number is empty' };
  }

  // Convert number to string (Excel sometimes imports numeric phone numbers)
  let cleaned = String(rawPhone).trim();

  // Strip spaces, dashes, brackets, and "+"
  cleaned = cleaned.replace(/[\s\-\(\)\+]/g, '');

  // Strip leading 0 if present (e.g., 09876543210 -> 9876543210)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Check if it's only digits now
  if (!/^\d+$/.test(cleaned)) {
    return {
      isValid: false,
      error: `Contains non-numeric characters: "${rawPhone}"`,
    };
  }

  // A 10-digit number gets 91 prefixed
  if (cleaned.length === 10) {
    return {
      isValid: true,
      normalized: `91${cleaned}`,
    };
  }

  // A 12-digit number starting with 91 is kept as is
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return {
      isValid: true,
      normalized: cleaned,
    };
  }

  // Anything else is flagged as invalid
  return {
    isValid: false,
    error: `Invalid length or format (${cleaned.length} digits). Must be 10 digits or 12 digits starting with 91.`,
  };
}

/**
 * Format phone number for clean UI display:
 * +91 98765 43210
 */
export function formatPhoneDisplay(normalizedPhone: string): string {
  if (!normalizedPhone) return '';
  if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
    const code = normalizedPhone.substring(0, 2);
    const p1 = normalizedPhone.substring(2, 7);
    const p2 = normalizedPhone.substring(7, 12);
    return `+${code} ${p1} ${p2}`;
  }
  return normalizedPhone;
}

import { normalizeIndianPhone } from '../../src';

/**
 * Turns whatever was typed or pasted into at most 10 digits.
 * "+91 98765-43210", "09876543210" and "919876543210" all become "9876543210".
 */
export function cleanPhoneInput(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length > 10 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** "+919876543210" shown as "+91 98765 43210". Anything unexpected is returned as is. */
export function formatPhone(e164: string): string {
  const match = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return match ? `+91 ${match[1]} ${match[2]}` : e164;
}

/** The E.164 number for 10 typed digits, or null if it is not a valid Indian mobile number. */
export function toE164(digits: string): string | null {
  return normalizeIndianPhone(digits);
}

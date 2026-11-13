/**
 * Indian mobile numbers. Accepts "9876543210", "09876543210", "919876543210",
 * "+91 98765 43210" and "+91-9876543210" and returns E.164 ("+919876543210"),
 * or null when the number is not a valid Indian mobile (10 digits starting 6 to 9).
 */
export function normalizeIndianPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, '');
  const match = /^(?:\+?91|0)?([6-9]\d{9})$/.exec(digits);
  return match ? `+91${match[1]}` : null;
}

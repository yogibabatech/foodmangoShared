/**
 * Money is always an integer number of paise (1 rupee = 100 paise).
 * Never use floats for money. These helpers only convert at the edges (input and display).
 */

export const CURRENCY = 'INR';
export const PAISE_PER_RUPEE = 100;

/** True when the value is a safe, non-negative whole number of paise. */
export function isValidPaise(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/** Throws if the value is not a valid paise amount. Returns it otherwise. */
export function assertPaise(value: unknown, label = 'amount'): number {
  if (!isValidPaise(value)) {
    throw new RangeError(`${label} must be a non-negative integer number of paise`);
  }
  return value;
}

/** Whole rupees to paise, e.g. 150 -> 15000. Only accepts whole rupees. */
export function rupeesToPaise(rupees: number): number {
  if (!Number.isSafeInteger(rupees) || rupees < 0) {
    throw new RangeError('rupees must be a non-negative whole number');
  }
  return rupees * PAISE_PER_RUPEE;
}

/** Display string, e.g. 15000 -> "₹150", 15050 -> "₹150.50". */
export function formatPaise(paise: number): string {
  assertPaise(paise);
  const rupees = Math.floor(paise / PAISE_PER_RUPEE);
  const rest = paise % PAISE_PER_RUPEE;
  const whole = rupees.toLocaleString('en-IN');
  return rest === 0 ? `₹${whole}` : `₹${whole}.${String(rest).padStart(2, '0')}`;
}

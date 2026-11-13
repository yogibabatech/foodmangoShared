/**
 * Indian PIN codes: six digits, the first one not 0. Accepts "786 180" and " 786180 " and
 * returns "786180", or null when the text is not a PIN code.
 */
export function normalizePincode(input: string): string | null {
  const digits = input.replace(/\s/g, '');
  return /^[1-9]\d{5}$/.test(digits) ? digits : null;
}

/**
 * Reads a list of PIN codes typed by the admin, separated by commas, spaces or new lines.
 * Returns the valid ones once each in order, and the pieces that are not PIN codes.
 */
export function parsePincodeList(text: string): { pincodes: string[]; invalid: string[] } {
  const pincodes: string[] = [];
  const invalid: string[] = [];
  for (const piece of text.split(/[\s,;]+/).filter(Boolean)) {
    const pincode = normalizePincode(piece);
    if (!pincode) invalid.push(piece);
    else if (!pincodes.includes(pincode)) pincodes.push(pincode);
  }
  return { pincodes: pincodes.sort(), invalid };
}

/**
 * Whether the kitchen delivers to a PIN code. An empty list means the admin has not limited the
 * delivery area, so every PIN code is served.
 */
export function isServiceable(pincode: string, servicePincodes: readonly string[]): boolean {
  return servicePincodes.length === 0 || servicePincodes.includes(pincode);
}

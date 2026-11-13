import { describe, expect, it } from 'vitest';
import { cleanPhoneInput, formatPhone, toE164 } from './phone';

describe('cleanPhoneInput', () => {
  it.each([
    ['9876543210', '9876543210'],
    ['98765 43210', '9876543210'],
    ['+91 98765-43210', '9876543210'],
    ['919876543210', '9876543210'],
    ['09876543210', '9876543210'],
    ['(987) 654-3210', '9876543210'],
    ['98765432109999', '9876543210'],
    ['abc', ''],
    ['', ''],
  ])('%j becomes %j', (input, expected) => {
    expect(cleanPhoneInput(input)).toBe(expected);
  });

  it('keeps a number that merely starts with 91 or 0 while it is still short', () => {
    expect(cleanPhoneInput('91')).toBe('91');
    expect(cleanPhoneInput('9198')).toBe('9198');
    expect(cleanPhoneInput('0')).toBe('0');
  });
});

describe('toE164', () => {
  it('accepts a valid Indian mobile', () => {
    expect(toE164('9876543210')).toBe('+919876543210');
  });
  it.each(['1234567890', '987654321', '98765432100', '', '5876543210'])('refuses %j', (input) => {
    expect(toE164(input)).toBeNull();
  });
});

describe('formatPhone', () => {
  it('groups an Indian number for reading', () => {
    expect(formatPhone('+919876543210')).toBe('+91 98765 43210');
  });
  it('leaves anything else as it is', () => {
    expect(formatPhone('+14155550123')).toBe('+14155550123');
  });
});

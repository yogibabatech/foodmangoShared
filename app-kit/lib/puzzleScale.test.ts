import { describe, expect, it } from 'vitest';
import { puzzleScale } from './puzzleScale';

describe('robot check puzzle size', () => {
  it('leaves the puzzle alone when the screen is big enough', () => {
    expect(puzzleScale(1280, 800)).toBe(1);
    expect(puzzleScale(430, 900)).toBe(1);
  });
  it('shrinks it to fit a short or narrow phone screen', () => {
    expect(puzzleScale(390, 500)).toBeCloseTo(500 / 600, 5);
    expect(puzzleScale(320, 800)).toBeCloseTo(320 / 410, 5);
  });
  it('never goes below half size, and copes with odd values', () => {
    expect(puzzleScale(200, 200)).toBe(0.5);
    expect(puzzleScale(Number.NaN, Number.NaN)).toBe(1);
  });
});

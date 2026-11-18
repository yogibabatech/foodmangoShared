/** Google's picture puzzle is about this big (pixels) when it opens. */
const PUZZLE_WIDTH = 410;
const PUZZLE_HEIGHT = 600;

/**
 * How much to shrink Google's picture puzzle so all of it, including its Verify button, fits the
 * screen. 1 means it already fits. The puzzle is never made smaller than half size, which would
 * be too small to tap.
 */
export function puzzleScale(viewportWidth: number, viewportHeight: number): number {
  const fit = Math.min(viewportWidth / PUZZLE_WIDTH, viewportHeight / PUZZLE_HEIGHT);
  return Math.max(0.5, Math.min(1, Number.isFinite(fit) ? fit : 1));
}

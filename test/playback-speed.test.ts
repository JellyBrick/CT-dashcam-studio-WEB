import { expect, it } from 'vitest';

import { clampPlaybackSpeed } from '../src/core/playback-speed';
it.each([6, 8, 100])('caps previously saved or requested %sx at 5x', (value) => {
  expect(clampPlaybackSpeed(value)).toBe(5);
});
it.each([0.5, 1, 1.2, 1.5, 2, 2.5, 3, 4, 5])('preserves supported %sx speed', (value) => {
  expect(clampPlaybackSpeed(value)).toBe(value);
});
it('handles invalid and out-of-range values', () => {
  expect(clampPlaybackSpeed(NaN)).toBe(1);
  expect(clampPlaybackSpeed(Infinity)).toBe(1);
  expect(clampPlaybackSpeed(-1)).toBe(0.5);
});

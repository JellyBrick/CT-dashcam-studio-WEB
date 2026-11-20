import { clamp } from 'es-toolkit';
export const clampPlaybackSpeed = (value: number): number => {
  return Number.isFinite(value) ? clamp(value, 0.5, 4) : 1;
};

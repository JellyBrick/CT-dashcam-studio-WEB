import { clamp } from 'es-toolkit';

import type { ClipItem } from './clip-scanner';

/** Persist real media duration; scanner defaults are estimates, not export boundaries. */
export const rememberClipDuration = (clip: ClipItem, duration: number): boolean => {
  if (!Number.isFinite(duration) || duration <= 0) return false;
  clip.durationSec = duration;
  return true;
};

export const clampSegmentToMedia = <T extends { clip: ClipItem; startSec: number; endSec: number }>(
  segment: T,
  duration: number,
): T => {
  if (!rememberClipDuration(segment.clip, duration)) {
    throw new Error('Could not read the source video duration.');
  }
  if (!Number.isFinite(segment.startSec) || !Number.isFinite(segment.endSec)) {
    throw new Error('Invalid export range.');
  }
  const startSec = clamp(segment.startSec, 0, duration);
  const endSec = clamp(segment.endSec, 0, duration);
  if (startSec >= endSec) throw new Error('The export range is outside the source video.');
  return { ...segment, startSec, endSec };
};

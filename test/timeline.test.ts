import { describe, expect, it } from 'vitest';

import { locateInTimeline, timelineOf } from '../src/studio/timeline';

import type { ClipItem } from '../src/core/clip-scanner';
import type { StudioState } from '../src/studio/store';

const clip = (folder: string, raw: string, durationSec = 60) =>
  ({ id: `${folder}/${raw}`, folder, timestampRaw: raw, durationSec }) as ClipItem;

const sentry = [
  clip('SentryClips/2026-10-07_07-35-44', '2026-10-07_07-25-00', 59.5),
  clip('SentryClips/2026-10-07_07-35-44', '2026-10-07_07-26-00', 60),
  clip('SentryClips/2026-10-07_07-35-44', '2026-10-07_07-27-00', 30),
];
const recent = [
  clip('RecentClips', '2026-10-07_08-00-00'),
  clip('RecentClips', '2026-10-07_08-01-00'),
];

const stateAt = (active: ClipItem, currentTimeSec: number) =>
  ({
    activeClip: active,
    currentTimeSec,
    durationSec: active.durationSec,
    folderGroups: [
      { folderName: 'SentryClips/2026-10-07_07-35-44', clips: sentry },
      { folderName: 'RecentClips', clips: recent },
    ],
  }) as unknown as StudioState;

describe('sentry folder timeline', () => {
  it('joins every clip of a sentry folder into one timeline', () => {
    const view = timelineOf(stateAt(sentry[1], 10));
    expect(view.offsets).toEqual([0, 59.5, 119.5]);
    expect(view.totalSec).toBe(149.5);
    expect(view.positionSec).toBe(69.5);
  });

  it('keeps other clips on their own timeline', () => {
    const view = timelineOf(stateAt(recent[1], 5));
    expect(view.clips).toEqual([recent[1]]);
    expect(view.positionSec).toBe(5);
  });

  it('maps a timeline position back to a clip and its local time', () => {
    const view = timelineOf(stateAt(sentry[0], 0));
    expect(locateInTimeline(view, 0)).toEqual({ clip: sentry[0], sec: 0 });
    expect(locateInTimeline(view, 60)).toEqual({ clip: sentry[1], sec: 0.5 });
    expect(locateInTimeline(view, 149.5)).toEqual({ clip: sentry[2], sec: 30 });
  });
});

import { ensureClipFiles } from '@/core/clip-scanner';
import { rememberClipDuration } from '@/core/clip-timing';
import {
  mergeMotionTimes,
  type MotionEvent,
  type MotionSensitivity,
  scanMotion,
} from '@/core/motion-scanner';

import { seekTimeline, SOURCE_FPS } from './playback';
import { getStudio, setStudio, type StudioState, useStudio } from './store';
import { isSentryClip, timelineClips, timelineKey, timelineOf } from './timeline';

const cache = new Map<string, MotionEvent[]>();
let scan: AbortController | null = null;

const scanKey = (state: StudioState) =>
  state.motionEnabled && isSentryClip(state.activeClip)
    ? `${timelineKey(state)}|${state.motionSensitivity}`
    : null;

const refreshMotion = async () => {
  scan?.abort();
  scan = null;
  const state = getStudio();
  const key = timelineKey(state);
  const cacheKey = scanKey(state);
  if (!key || !cacheKey) {
    setStudio({ motion: null });
    return;
  }
  const cached = cache.get(cacheKey);
  if (cached) {
    setStudio({ motion: { key, pct: 100, events: cached, failed: false } });
    return;
  }
  const controller = new AbortController();
  scan = controller;
  const update = (pct: number, events: MotionEvent[] | null = null, failed = false) => {
    if (!controller.signal.aborted) setStudio({ motion: { key, pct, events, failed } });
  };
  update(0);
  const clips = timelineClips(state);
  const times: number[] = [];
  let offset = 0;
  try {
    for (const [index, clip] of clips.entries()) {
      await ensureClipFiles(clip);
      const result = await scanMotion(
        clip.cams,
        state.motionSensitivity,
        (pct) => update(Math.round(((index + pct / 100) / clips.length) * 100)),
        controller.signal,
      );
      if (controller.signal.aborted) return;
      rememberClipDuration(clip, result.durationSec);
      times.push(...result.times.map((time) => time + offset));
      offset += clip.durationSec || 60;
    }
    const events = mergeMotionTimes(times, offset);
    cache.set(cacheKey, events);
    update(100, events);
  } catch (error) {
    console.warn('[Motion] scan failed:', error);
    update(0, null, true);
  }
};

export const setMotionEnabled = (motionEnabled: boolean) => setStudio({ motionEnabled });

export const setMotionSensitivity = (motionSensitivity: MotionSensitivity) =>
  setStudio({ motionSensitivity });

export const jumpToMotion = (direction: 1 | -1) => {
  const state = getStudio();
  const starts = state.motion?.events?.map((event) => event.startSec) ?? [];
  if (starts.length === 0) return;
  const position = timelineOf(state).positionSec;
  const margin = 10 / SOURCE_FPS;
  const target =
    direction > 0
      ? (starts.find((start) => start > position + margin) ?? starts[0])
      : (starts.findLast((start) => start < position - margin) ?? starts.at(-1)!);
  seekTimeline(target).catch(reportError);
};

export const watchMotion = () =>
  useStudio.subscribe((state, previous) => {
    if (scanKey(state) !== scanKey(previous)) refreshMotion().catch(reportError);
  });

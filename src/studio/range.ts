import { clamp, memoize } from 'es-toolkit';
import { toast } from 'sonner';

import { i18n } from '@/i18n';

import {
  allClips,
  clipPosition,
  getStudio,
  type RangePoint,
  setStudio,
  type StudioState,
} from './store';

import type { ClipItem } from '@/core/clip-scanner';
import type { ExportClipSegment } from '@/core/exporter';
import type { TFunction } from 'i18next';

const MAX_RANGE_SEC = 1800;

export const parseClipTimeMs = memoize((timestampRaw: string): number => {
  const [date, time] = timestampRaw.split('_');
  if (!date || !time) return 0;
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  const [hh = 0, mm = 0, ss = 0] = time.replace(/:/g, '-').split('-').map(Number);
  return new Date(y, m - 1, d, hh, mm, ss).getTime();
});

const clipEndMs = (clip: ClipItem) =>
  parseClipTimeMs(clip.timestampRaw) + (clip.durationSec || 60) * 1000;

const currentPoint = (): RangePoint | null => {
  const { activeClip, currentTimeSec } = getStudio();
  if (!activeClip) return null;
  return {
    clipId: activeClip.id,
    sec: currentTimeSec,
    absTimeMs: parseClipTimeMs(activeClip.timestampRaw) + currentTimeSec * 1000,
  };
};

const exceedsMaxDuration = (startMs: number, endMs: number) => {
  const durationSec = (endMs - startMs) / 1000;
  if (durationSec <= MAX_RANGE_SEC) return false;
  toast.error(i18n.t('alert_max_duration', { 0: (durationSec / 60).toFixed(1) }));
  return true;
};

const applyStart = (point: RangePoint) => {
  const { endPoint } = getStudio();
  if (endPoint) {
    if (point.absTimeMs >= endPoint.absTimeMs) {
      toast.error(i18n.t('alert_in_after_out'));
      return;
    }
    if (exceedsMaxDuration(point.absTimeMs, endPoint.absTimeMs)) return;
  }
  setStudio({ startPoint: point });
};

const applyEnd = (point: RangePoint) => {
  const { startPoint } = getStudio();
  if (startPoint) {
    if (point.absTimeMs <= startPoint.absTimeMs) {
      toast.error(i18n.t('alert_out_before_in'));
      return;
    }
    if (exceedsMaxDuration(startPoint.absTimeMs, point.absTimeMs)) return;
  }
  setStudio({ endPoint: point });
};

export const setInPoint = () => {
  const point = currentPoint();
  if (point) applyStart(point);
};

export const setOutPoint = () => {
  const point = currentPoint();
  if (point) applyEnd(point);
};

export const startRangeAtClip = (clip: ClipItem) =>
  applyStart({ clipId: clip.id, sec: 0, absTimeMs: parseClipTimeMs(clip.timestampRaw) });

export const endRangeAtClip = (clip: ClipItem) =>
  applyEnd({ clipId: clip.id, sec: clip.durationSec || 60, absTimeMs: clipEndMs(clip) });

export const resetRange = () => setStudio({ startPoint: null, endPoint: null });

export const buildTargetClipChain = (state: StudioState = getStudio()): ExportClipSegment[] => {
  const { activeClip, startPoint, endPoint, durationSec } = state;
  if (!activeClip) return [];
  const whole = [
    { clip: activeClip, startSec: 0, endSec: durationSec, baseTimeStr: activeClip.timestampStr },
  ];
  if (!startPoint && !endPoint) return whole;

  const clips = allClips(state);
  let startIdx = clipPosition(startPoint?.clipId ?? activeClip.id, state);
  let endIdx = clipPosition(endPoint?.clipId ?? activeClip.id, state);
  if (startIdx === -1 || endIdx === -1) return whole;
  if (startIdx > endIdx) [startIdx, endIdx] = [endIdx, startIdx];

  return clips.slice(startIdx, endIdx + 1).flatMap((clip, offset) => {
    const length = clip.durationSec || 60;
    const index = startIdx + offset;
    const from = index === startIdx && startPoint ? startPoint.sec : 0;
    const to = index === endIdx && endPoint ? endPoint.sec : length;
    const startSec = clamp(from, 0, length);
    const endSec = clamp(to, 0, length);
    return startSec < endSec ? [{ clip, startSec, endSec, baseTimeStr: clip.timestampStr }] : [];
  });
};

export const rangeBounds = (state: StudioState): { startMs: number; endMs: number } | null => {
  const { activeClip, startPoint, endPoint, durationSec } = state;
  if (!activeClip || (!startPoint && !endPoint)) return null;
  const clipStart = parseClipTimeMs(activeClip.timestampRaw);
  return {
    startMs: startPoint?.absTimeMs ?? clipStart,
    endMs: endPoint?.absTimeMs ?? clipStart + durationSec * 1000,
  };
};

export const isClipInRange = (clip: ClipItem, bounds: { startMs: number; endMs: number } | null) =>
  Boolean(
    bounds && parseClipTimeMs(clip.timestampRaw) < bounds.endMs && clipEndMs(clip) > bounds.startMs,
  );

export const activeRangeOverlay = (state: StudioState) => {
  const { activeClip, startPoint, endPoint, durationSec } = state;
  if (!activeClip || durationSec <= 0) return null;
  const clipStart = parseClipTimeMs(activeClip.timestampRaw);
  const clipEnd = clipStart + durationSec * 1000;
  const isStart = startPoint?.clipId === activeClip.id;
  const isEnd = endPoint?.clipId === activeClip.id;
  const afterStart = !startPoint || clipStart >= startPoint.absTimeMs;
  const beforeEnd = !endPoint || clipEnd <= endPoint.absTimeMs;
  if (!startPoint && !endPoint) return null;
  if (!isStart && !isEnd && !(afterStart && beforeEnd)) return null;

  const inSec = isStart && startPoint ? startPoint.sec : 0;
  const outSec = isEnd && endPoint ? endPoint.sec : durationSec;
  if (inSec > outSec) return null;
  const toPct = (sec: number) => clamp((sec / durationSec) * 100, 0, 100);
  return {
    left: toPct(inSec),
    width: Math.max(0.2, toPct(outSec) - toPct(inSec)),
    start: isStart,
    end: isEnd,
  };
};

const formatClock = (ms: number) => {
  const date = new Date(ms);
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
};

export const rangeSummary = (state: StudioState, t: TFunction): string => {
  const { activeClip, startPoint, endPoint, durationSec } = state;
  if (!activeClip) return t('range_unspecified');
  if (startPoint && endPoint) {
    const chain = buildTargetClipChain(state);
    return t('range_specified', {
      0: formatClock(startPoint.absTimeMs),
      1: formatClock(endPoint.absTimeMs),
      2: ((endPoint.absTimeMs - startPoint.absTimeMs) / 1000).toFixed(1),
      3: chain.length > 1 ? t('range_multi_files', { 0: chain.length }) : '',
    });
  }
  if (startPoint) return t('range_need_out', { 0: formatClock(startPoint.absTimeMs) });
  if (endPoint) return t('range_need_in', { 0: formatClock(endPoint.absTimeMs) });
  return t('range_unspecified_full', { 0: durationSec.toFixed(1) });
};

export const formatTimecode = (sec: number) => {
  const total = Math.floor(sec);
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${Math.floor(total / 3600)}:${minutes}:${seconds}`;
};

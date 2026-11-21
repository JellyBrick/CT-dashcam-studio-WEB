import type { StudioState } from './store';
import type { ClipItem } from '@/core/clip-scanner';

export const isSentryClip = (clip: ClipItem | null) => !!clip && /Sentry/i.test(clip.folder);

export interface TimelineView {
  clips: readonly ClipItem[];
  offsets: number[];
  activeIndex: number;
  totalSec: number;
  positionSec: number;
}

const clipLength = (clip: ClipItem, state: StudioState) =>
  clip === state.activeClip ? state.durationSec : clip.durationSec || 60;

const groupCache = new WeakMap<ClipItem, { groups: unknown; clips: readonly ClipItem[] }>();

export const timelineClips = (state: StudioState): readonly ClipItem[] => {
  const clip = state.activeClip;
  if (!clip) return [];
  if (!isSentryClip(clip)) return [clip];
  const cached = groupCache.get(clip);
  if (cached?.groups === state.folderGroups) return cached.clips;
  const clips = state.folderGroups.find((group) => group.clips.includes(clip))?.clips ?? [clip];
  groupCache.set(clip, { groups: state.folderGroups, clips });
  return clips;
};

export const timelineOf = (state: StudioState): TimelineView => {
  const clips = timelineClips(state);
  const offsets: number[] = [];
  let totalSec = 0;
  for (const clip of clips) {
    offsets.push(totalSec);
    totalSec += clipLength(clip, state);
  }
  const activeIndex = state.activeClip ? clips.indexOf(state.activeClip) : -1;
  const positionSec = (offsets[activeIndex] ?? 0) + state.currentTimeSec;
  return { clips, offsets, activeIndex, totalSec, positionSec };
};

export const timelineKey = (state: StudioState) => timelineClips(state)[0]?.id ?? null;

export const locateInTimeline = (view: TimelineView, sec: number) => {
  const last = view.clips.length - 1;
  const index = view.offsets.findLastIndex((offset, i) => i === 0 || sec >= offset);
  const i = Math.min(Math.max(0, index), last);
  return { clip: view.clips[i], sec: Math.max(0, sec - view.offsets[i]) };
};

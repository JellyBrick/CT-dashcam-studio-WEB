import { compact, sum } from 'es-toolkit';
import { BlobSource, CanvasSink, Input, MP4 } from 'mediabunny';

import type { CameraKey } from './constants';

export const MOTION_SENSITIVITY = {
  low: { pixelDiff: 35, minArea: 800 },
  normal: { pixelDiff: 25, minArea: 400 },
  high: { pixelDiff: 15, minArea: 150 },
  ultra: { pixelDiff: 10, minArea: 50 },
} as const;

export type MotionSensitivity = keyof typeof MOTION_SENSITIVITY;

export interface MotionEvent {
  startSec: number;
  endSec: number;
}

const SCAN_W = 160;
const SCAN_H = 90;
const SCAN_FPS = 6;
const DELAY_SAMPLES = 3;
const LEAD_IN_SEC = 1.5;
const LEAD_OUT_SEC = 2;
const MERGE_GAP_SEC = 4;

export const mergeMotionTimes = (times: number[], durationSec: number): MotionEvent[] => {
  const events: MotionEvent[] = [];
  for (const time of [...times].sort((a, b) => a - b)) {
    const startSec = Math.max(0, time - LEAD_IN_SEC);
    const endSec = Math.min(durationSec, time + LEAD_OUT_SEC);
    const last = events.at(-1);
    if (last && startSec <= last.endSec + MERGE_GAP_SEC)
      last.endSec = Math.max(last.endSec, endSec);
    else events.push({ startSec, endSec });
  }
  return events;
};

export const countChangedPixels = (
  current: Uint8Array,
  previous: Uint8Array,
  threshold: number,
) => {
  let changed = 0;
  for (let i = 0; i < current.length; i++) {
    if (Math.abs(current[i] - previous[i]) > threshold) changed++;
  }
  return changed;
};

const toGray = (canvas: HTMLCanvasElement | OffscreenCanvas, gray: Uint8Array) => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  const rgba = ctx?.getImageData(0, 0, SCAN_W, SCAN_H).data;
  if (!rgba) return false;
  for (let i = 0, j = 0; i < gray.length; i++, j += 4) {
    gray[i] = (rgba[j] * 299 + rgba[j + 1] * 587 + rgba[j + 2] * 114) / 1000;
  }
  return true;
};

export const scanMotion = async (
  files: Partial<Record<CameraKey, File>>,
  sensitivity: MotionSensitivity,
  onProgress: (pct: number) => void,
  signal: AbortSignal,
): Promise<{ times: number[]; durationSec: number }> => {
  const { pixelDiff, minArea } = MOTION_SENSITIVITY[sensitivity];
  const inputs = compact(Object.values(files)).map(
    (file) => new Input({ source: new BlobSource(file), formats: [MP4] }),
  );
  const progress = inputs.map(() => 0);
  const report = () => onProgress(Math.round((sum(progress) / progress.length) * 100));
  try {
    const perCamera = await Promise.all(
      inputs.map(async (input, index) => {
        const track = await input.getPrimaryVideoTrack();
        if (!track) return { times: [], durationSec: 0 };
        const durationSec = await track.computeDuration();
        const sampleTimes = Array.from(
          { length: Math.floor(durationSec * SCAN_FPS) },
          (_, i) => i / SCAN_FPS,
        );
        const sink = new CanvasSink(track, {
          width: SCAN_W,
          height: SCAN_H,
          fit: 'fill',
          poolSize: 2,
        });
        const history = Array.from(
          { length: DELAY_SAMPLES + 1 },
          () => new Uint8Array(SCAN_W * SCAN_H),
        );
        const times: number[] = [];
        let sample = 0;
        let stored = 0;
        for await (const frame of sink.canvasesAtTimestamps(sampleTimes)) {
          if (signal.aborted) break;
          sample++;
          const gray = history[stored % history.length];
          if (!frame || !toGray(frame.canvas, gray)) continue;
          if (stored >= DELAY_SAMPLES) {
            const previous = history[(stored - DELAY_SAMPLES) % history.length];
            if (countChangedPixels(gray, previous, pixelDiff) > minArea / 4) {
              times.push(frame.timestamp);
            }
          }
          stored++;
          if (sample % SCAN_FPS === 0) {
            progress[index] = sample / sampleTimes.length;
            report();
          }
        }
        progress[index] = 1;
        report();
        return { times, durationSec };
      }),
    );
    return {
      times: perCamera.flatMap((camera) => camera.times),
      durationSec: Math.max(0, ...perCamera.map((camera) => camera.durationSec)),
    };
  } finally {
    for (const input of inputs) input.dispose();
  }
};

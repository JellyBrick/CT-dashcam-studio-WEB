// Ported from core/privacy_filter.py (PrivacyFilter) via the earlier web face mosaic.
import { BoxTimeline, BoxTracker, canvasGray, type GraySource, type Rect } from './box-tracker';
import { PlateEnhancer } from './plate-enhancer';
import { findPlates } from './plate-finder';
import { FaceDetector, VehicleDetector } from './privacy-models';

import type { CameraKey } from './constants';
import type { Pixels } from './image-ops';

export interface PrivacyFlags {
  face: boolean;
  plate: 'blur' | 'enhance' | null;
}

export type FrameSources = Partial<Record<CameraKey, CanvasImageSource | null | undefined>>;
export type ProcessedFrames = Partial<Record<CameraKey, CanvasImageSource>>;

const DETECT_INTERVAL = 4;

let mosaicScratch: HTMLCanvasElement | null = null;

export const applyMosaic = (canvas: HTMLCanvasElement, rects: Rect[]) => {
  const ctx = canvas.getContext('2d');
  if (!ctx || rects.length === 0) return;
  mosaicScratch ??= document.createElement('canvas');
  const scratchCtx = mosaicScratch.getContext('2d')!;
  for (const [rx, ry, rw, rh] of rects) {
    const x1 = Math.max(0, Math.floor(rx));
    const y1 = Math.max(0, Math.floor(ry));
    const w = Math.min(canvas.width, Math.ceil(rx + rw)) - x1;
    const h = Math.min(canvas.height, Math.ceil(ry + rh)) - y1;
    if (w < 2 || h < 2) continue;
    const block = Math.max(8, Math.min(w, h) / 6);
    const bw = Math.max(2, Math.round(w / block));
    const bh = Math.max(2, Math.round(h / block));
    mosaicScratch.width = bw;
    mosaicScratch.height = bh;
    scratchCtx.drawImage(canvas, x1, y1, w, h, 0, 0, bw, bh);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mosaicScratch, 0, 0, bw, bh, x1, y1, w, h);
    ctx.imageSmoothingEnabled = true;
  }
};

let regionCanvas: HTMLCanvasElement | null = null;

const readRegion = (bitmap: ImageBitmap, [rx, ry, rw, rh]: Rect): Pixels => {
  const x = Math.min(bitmap.width, Math.max(0, Math.floor(rx)));
  const y = Math.min(bitmap.height, Math.max(0, Math.floor(ry)));
  const w = Math.max(0, Math.min(bitmap.width, Math.ceil(rx + rw)) - x);
  const h = Math.max(0, Math.min(bitmap.height, Math.ceil(ry + rh)) - y);
  if (w === 0 || h === 0) return { data: new Uint8ClampedArray(0), x, y, w, h };
  regionCanvas ??= document.createElement('canvas');
  regionCanvas.width = w;
  regionCanvas.height = h;
  const ctx = regionCanvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bitmap, x, y, w, h, 0, 0, w, h);
  return { data: ctx.getImageData(0, 0, w, h).data, x, y, w, h };
};

interface Detection {
  faces: Rect[] | null;
  plates: Rect[] | null;
}

interface CamState {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  faces: BoxTracker;
  plates: BoxTracker;
  enhancer: PlateEnhancer;
  frameCount: number;
  lastTime: number;
  needsDetect: boolean;
  needsTemplateRefresh: boolean;
  hasContent: boolean;
  newFrame: boolean;
  watched: HTMLVideoElement | null;
}

const sourceSize = (src: CanvasImageSource): [number, number] => {
  const size = src as Partial<Record<'videoWidth' | 'videoHeight' | 'width' | 'height', number>>;
  return [size.videoWidth || size.width || 0, size.videoHeight || size.height || 0];
};

const isReady = (src: CanvasImageSource) =>
  !(src instanceof HTMLVideoElement) || (src.readyState >= 2 && src.videoWidth > 0);

export class PrivacyProcessor {
  private cams = new Map<CameraKey, CamState>();
  private previewBusy = false;
  private timeline = new BoxTimeline();
  private timelineReady = false;
  private analysisTimes = new Map<CameraKey, number>();
  flags: PrivacyFlags = { face: false, plate: null };
  onPreviewUpdate: () => void = () => {};

  private faceDetector: FaceDetector | null;
  private vehicleDetector: VehicleDetector | null;

  constructor(faceDetector: FaceDetector | null, vehicleDetector: VehicleDetector | null) {
    this.faceDetector = faceDetector;
    this.vehicleDetector = vehicleDetector;
  }

  static async load(flags: PrivacyFlags, current?: PrivacyProcessor | null) {
    const [face, vehicle] = await Promise.all([
      flags.face ? (current?.faceDetector ?? FaceDetector.create()) : null,
      flags.plate ? (current?.vehicleDetector ?? VehicleDetector.create()) : null,
    ]);
    const processor = new PrivacyProcessor(
      face ?? current?.faceDetector ?? null,
      vehicle ?? current?.vehicleDetector ?? null,
    );
    processor.flags = flags;
    return processor;
  }

  get active() {
    return this.flags.face || this.flags.plate !== null;
  }

  get hasFaceDetector() {
    return this.faceDetector !== null;
  }

  get hasVehicleDetector() {
    return this.vehicleDetector !== null;
  }

  private state(key: CameraKey, w: number, h: number) {
    let st = this.cams.get(key);
    if (st && (st.canvas.width !== w || st.canvas.height !== h)) st = undefined;
    if (!st) {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      st = {
        canvas,
        ctx,
        faces: new BoxTracker(1, 48),
        plates: new BoxTracker(1, 48),
        enhancer: new PlateEnhancer(),
        frameCount: 0,
        lastTime: -1,
        needsDetect: true,
        needsTemplateRefresh: false,
        hasContent: false,
        newFrame: true,
        watched: null,
      };
      this.cams.set(key, st);
    }
    return st;
  }

  private snapshot(key: CameraKey, src: CanvasImageSource) {
    const [w, h] = sourceSize(src);
    if (w <= 0 || h <= 0 || !isReady(src)) return null;
    const st = this.state(key, w, h);
    if (!st) return null;
    st.ctx.drawImage(src, 0, 0, w, h);
    st.hasContent = true;
    return st;
  }

  private detect(source: HTMLCanvasElement | OffscreenCanvas): Promise<Detection> {
    const { width: w, height: h } = source;
    const faceInput = this.flags.face ? this.faceDetector?.grab(source, w, h) : undefined;
    const vehicleInput = this.flags.plate ? this.vehicleDetector?.grab(source, w, h) : undefined;
    const frame = vehicleInput ? createImageBitmap(source) : null;
    return (async () => {
      try {
        const faces = faceInput ? await this.faceDetector!.detect(faceInput) : null;
        const vehicles = vehicleInput ? await this.vehicleDetector!.detect(vehicleInput) : null;
        if (!vehicles || !frame) return { faces, plates: null };
        const bitmap = await frame;
        return { faces, plates: findPlates(vehicles, w, (area) => readRegion(bitmap, area)) };
      } finally {
        frame?.then(
          (bitmap) => bitmap.close(),
          () => {},
        );
      }
    })();
  }

  private paint(st: CamState, faces: Rect[], plates: Rect[]) {
    const mosaic = this.flags.plate === 'blur' ? [...faces, ...plates] : faces;
    applyMosaic(st.canvas, mosaic);
    if (this.flags.plate === 'enhance') st.enhancer.apply(st.ctx, plates);
  }

  beginExportAnalysis() {
    this.timeline.clear();
    this.timelineReady = false;
    this.analysisTimes.clear();
    this.cams.clear();
  }

  beginExportSegment(sampleIntervalSec: number) {
    this.analysisTimes.clear();
    this.timeline.beginSegment(sampleIntervalSec);
  }

  async analyzeExport(key: CameraKey, canvas: HTMLCanvasElement | OffscreenCanvas, time: number) {
    if (time <= (this.analysisTimes.get(key) ?? -Infinity) + 1e-7) return;
    this.analysisTimes.set(key, time);
    const { faces, plates } = await this.detect(canvas);
    if (faces) this.timeline.record(`${key}:face`, time, faces, canvas.width, canvas.height);
    if (plates) this.timeline.record(`${key}:plate`, time, plates, canvas.width, canvas.height);
  }

  finishExportAnalysis() {
    this.timeline.finalize();
    this.timelineReady = true;
  }

  processExport(frames: FrameSources, time: number): ProcessedFrames {
    if (!this.timelineReady) throw new Error('Privacy analysis has not finished');
    const out: ProcessedFrames = {};
    for (const key of Object.keys(frames) as CameraKey[]) {
      const src = frames[key];
      if (!src) continue;
      const st = this.snapshot(key, src);
      if (!st) throw new Error(`No decoded frame for ${key}`);
      const { width, height } = st.canvas;
      this.paint(
        st,
        this.timeline.boxesAt(`${key}:face`, time, width, height),
        this.timeline.boxesAt(`${key}:plate`, time, width, height),
      );
      out[key] = st.canvas;
    }
    return out;
  }

  private watchFrames(st: CamState, src: CanvasImageSource) {
    if (!(src instanceof HTMLVideoElement) || st.watched === src) return;
    st.watched = src;
    const onFrame = () => {
      if (st.watched !== src) return;
      st.newFrame = true;
      src.requestVideoFrameCallback(onFrame);
    };
    src.requestVideoFrameCallback(onFrame);
  }

  private startPreviewDetection(st: CamState) {
    this.previewBusy = true;
    st.needsDetect = false;
    this.detect(st.canvas)
      .then(({ faces, plates }) => {
        if (faces) st.faces.update(faces);
        if (plates) st.plates.update(plates);
        st.needsTemplateRefresh = true;
        this.onPreviewUpdate();
      })
      .catch((error: unknown) => {
        console.warn('[Privacy] preview detection failed:', error);
        st.needsDetect = true;
      })
      .finally(() => {
        this.previewBusy = false;
      });
  }

  processPreview(frames: FrameSources): ProcessedFrames {
    const out: ProcessedFrames = {};
    const pending: { st: CamState; faces: Rect[]; plates: Rect[] }[] = [];
    for (const key of Object.keys(frames) as CameraKey[]) {
      const src = frames[key];
      if (!src) continue;
      const cached = this.cams.get(key);
      if (
        cached?.hasContent &&
        cached.watched === src &&
        !cached.newFrame &&
        !cached.needsTemplateRefresh &&
        !(cached.needsDetect && !this.previewBusy)
      ) {
        out[key] = cached.canvas;
        continue;
      }
      const st = this.snapshot(key, src);
      if (!st) {
        if (cached?.hasContent) out[key] = cached.canvas;
        continue;
      }
      this.watchFrames(st, src);
      st.newFrame = false;
      const gray: GraySource = canvasGray(st.ctx, st.canvas.width, st.canvas.height);
      const time = src instanceof HTMLVideoElement ? src.currentTime : 0;
      if (st.lastTime >= 0 && Math.abs(time - st.lastTime) > 1) {
        st.faces.reset();
        st.plates.reset();
        st.needsDetect = true;
      }
      const advanced = Math.abs(time - st.lastTime) > 1e-4;
      if (st.needsTemplateRefresh) {
        st.faces.refreshTemplates(gray);
        st.plates.refreshTemplates(gray);
        st.needsTemplateRefresh = false;
      }
      const track = (tracker: BoxTracker) =>
        advanced ? tracker.trackInterframe(gray) : tracker.current();
      const faces = this.flags.face ? track(st.faces) : [];
      const plates = this.flags.plate ? track(st.plates) : [];
      if (advanced) {
        st.lastTime = time;
        st.frameCount += 1;
      }
      const due = advanced && st.frameCount % DETECT_INTERVAL === 1;
      if (!this.previewBusy && (st.needsDetect || due)) this.startPreviewDetection(st);
      pending.push({ st, faces, plates });
      out[key] = st.canvas;
    }
    for (const { st, faces, plates } of pending) this.paint(st, faces, plates);
    return out;
  }

  resetPreview() {
    for (const st of this.cams.values()) {
      st.faces.reset();
      st.plates.reset();
      st.enhancer.reset();
      st.frameCount = 0;
      st.lastTime = -1;
      st.needsDetect = true;
      st.needsTemplateRefresh = false;
    }
  }
}

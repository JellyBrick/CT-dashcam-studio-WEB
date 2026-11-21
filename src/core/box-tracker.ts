// Ported from core/privacy_filter.py (BoxTracker) via the earlier web face mosaic.
import { clamp } from 'es-toolkit';

export type Rect = [x: number, y: number, w: number, h: number];

export interface GrayPatch {
  data: Uint8Array;
  w: number;
  h: number;
  x: number;
  y: number;
}

export interface GraySource {
  width: number;
  height: number;
  region: (x1: number, y1: number, x2: number, y2: number) => GrayPatch | null;
}

export const iou = (a: Rect, b: Rect) => {
  const ix1 = Math.max(a[0], b[0]);
  const iy1 = Math.max(a[1], b[1]);
  const ix2 = Math.min(a[0] + a[2], b[0] + b[2]);
  const iy2 = Math.min(a[1] + a[3], b[1] + b[3]);
  if (ix2 <= ix1 || iy2 <= iy1) return 0;
  const inter = (ix2 - ix1) * (iy2 - iy1);
  const union = a[2] * a[3] + b[2] * b[3] - inter;
  return union > 0 ? inter / union : 0;
};

export const nms = (boxes: Rect[], scores: number[], nmsThreshold: number): number[] => {
  const order = boxes.map((_, i) => i).sort((p, q) => scores[q] - scores[p]);
  const keep: number[] = [];
  for (const i of order) {
    if (keep.every((k) => iou(boxes[i], boxes[k]) <= nmsThreshold)) keep.push(i);
  }
  return keep;
};

export const toGray = (r: number, g: number, b: number) => (r * 299 + g * 587 + b * 114) / 1000;

export const canvasGray = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
): GraySource => ({
  width,
  height,
  region: (x1, y1, x2, y2) => {
    const rx1 = Math.max(0, Math.floor(x1));
    const ry1 = Math.max(0, Math.floor(y1));
    const w = Math.min(width, Math.ceil(x2)) - rx1;
    const h = Math.min(height, Math.ceil(y2)) - ry1;
    if (w <= 0 || h <= 0) return null;
    const rgba = ctx.getImageData(rx1, ry1, w, h).data;
    const data = new Uint8Array(w * h);
    for (let i = 0, j = 0; i < data.length; i++, j += 4) {
      data[i] = toGray(rgba[j], rgba[j + 1], rgba[j + 2]);
    }
    return { data, w, h, x: rx1, y: ry1 };
  },
});

const downsample2 = (src: Uint8Array, w: number, h: number) => {
  const nw = Math.floor(w / 2);
  const nh = Math.floor(h / 2);
  const data = new Uint8Array(nw * nh);
  for (let y = 0; y < nh; y++) {
    const r0 = y * 2 * w;
    const r1 = r0 + w;
    for (let x = 0; x < nw; x++) {
      const i = x * 2;
      data[y * nw + x] = (src[r0 + i] + src[r0 + i + 1] + src[r1 + i] + src[r1 + i + 1]) >> 2;
    }
  }
  return { data, w: nw, h: nh };
};

export const matchTemplateNcc = (
  img: Uint8Array,
  iw: number,
  ih: number,
  tpl: Uint8Array,
  tw: number,
  th: number,
): { score: number; x: number; y: number } | null => {
  if (tw <= 0 || th <= 0 || iw < tw || ih < th) return null;
  const n = tw * th;
  let sumT = 0;
  for (let i = 0; i < n; i++) sumT += tpl[i];
  const meanT = sumT / n;
  const tz = new Float32Array(n);
  let sumTT = 0;
  for (let i = 0; i < n; i++) {
    tz[i] = tpl[i] - meanT;
    sumTT += tz[i] * tz[i];
  }
  if (sumTT < 1e-6) return null;

  const stride = iw + 1;
  const integ = new Float64Array(stride * (ih + 1));
  const integ2 = new Float64Array(stride * (ih + 1));
  for (let y = 0; y < ih; y++) {
    let rowSum = 0;
    let rowSum2 = 0;
    for (let x = 0; x < iw; x++) {
      const v = img[y * iw + x];
      rowSum += v;
      rowSum2 += v * v;
      integ[(y + 1) * stride + x + 1] = integ[y * stride + x + 1] + rowSum;
      integ2[(y + 1) * stride + x + 1] = integ2[y * stride + x + 1] + rowSum2;
    }
  }

  let best = -2;
  let bx = 0;
  let by = 0;
  for (let y = 0; y <= ih - th; y++) {
    for (let x = 0; x <= iw - tw; x++) {
      const a = y * stride + x;
      const c = (y + th) * stride + x;
      const sumI = integ[c + tw] - integ[a + tw] - integ[c] + integ[a];
      const sumII = integ2[c + tw] - integ2[a + tw] - integ2[c] + integ2[a];
      const varI = sumII - (sumI * sumI) / n;
      if (varI < 1e-6) continue;
      let num = 0;
      let ti = 0;
      for (let ty = 0; ty < th; ty++) {
        const rowBase = (y + ty) * iw + x;
        for (let tx = 0; tx < tw; tx++) num += tz[ti++] * img[rowBase + tx];
      }
      const score = num / Math.sqrt(sumTT * varI);
      if (score > best) {
        best = score;
        bx = x;
        by = y;
      }
    }
  }
  return best < -1.5 ? null : { score: best, x: bx, y: by };
};

interface Plane {
  data: Uint8Array;
  w: number;
  h: number;
}

const zeroMean = ({ data }: Plane) => {
  let sum = 0;
  for (const value of data) sum += value;
  const mean = sum / data.length;
  const centered = new Float64Array(data.length);
  let sumTT = 0;
  for (let i = 0; i < data.length; i++) {
    centered[i] = data[i] - mean;
    sumTT += centered[i] * centered[i];
  }
  return { centered, sumTT };
};

const nccAt = (
  img: Plane,
  tpl: Plane,
  { centered, sumTT }: ReturnType<typeof zeroMean>,
  x: number,
  y: number,
) => {
  const { w: tw, h: th } = tpl;
  if (x < 0 || y < 0 || x + tw > img.w || y + th > img.h) return -2;
  let sumI = 0;
  let sumII = 0;
  let num = 0;
  for (let ty = 0, ti = 0; ty < th; ty++) {
    const base = (y + ty) * img.w + x;
    for (let tx = 0; tx < tw; tx++, ti++) {
      const iv = img.data[base + tx];
      sumI += iv;
      sumII += iv * iv;
      num += centered[ti] * iv;
    }
  }
  const varI = sumII - (sumI * sumI) / (tw * th);
  if (varI < 1e-6 || sumTT < 1e-6) return -2;
  return num / Math.sqrt(sumTT * varI);
};

const matchPatch = (roi: GrayPatch, tpl: GrayPatch) => {
  if (tpl.w < 20 || tpl.h < 16 || roi.w < 16 || roi.h < 16) {
    return matchTemplateNcc(roi.data, roi.w, roi.h, tpl.data, tpl.w, tpl.h);
  }
  const rois: Plane[] = [roi, downsample2(roi.data, roi.w, roi.h)];
  const tpls: Plane[] = [tpl, downsample2(tpl.data, tpl.w, tpl.h)];
  while (tpls[tpls.length - 1].w >= 32 && tpls[tpls.length - 1].h >= 24) {
    const r = rois[rois.length - 1];
    const t = tpls[tpls.length - 1];
    if (r.w < 2 * Math.floor(t.w / 2) || r.h < 2 * Math.floor(t.h / 2)) break;
    rois.push(downsample2(r.data, r.w, r.h));
    tpls.push(downsample2(t.data, t.w, t.h));
  }
  const top = rois.length - 1;
  const coarse = matchTemplateNcc(
    rois[top].data,
    rois[top].w,
    rois[top].h,
    tpls[top].data,
    tpls[top].w,
    tpls[top].h,
  );
  if (!coarse) return null;
  let best = coarse;
  for (let level = top - 1; level >= 0; level--) {
    const stats = zeroMean(tpls[level]);
    let refined = { score: -2, x: best.x * 2, y: best.y * 2 };
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = best.x * 2 + dx;
        const y = best.y * 2 + dy;
        const score = nccAt(rois[level], tpls[level], stats, x, y);
        if (score > refined.score) refined = { score, x, y };
      }
    }
    best = refined.score > -1.5 ? refined : { ...best, x: best.x * 2, y: best.y * 2 };
  }
  return best;
};

interface Track {
  lastDetection: Rect;
  rect: Rect;
  center: [number, number];
  velocity: [number, number];
  size: [number, number];
  hits: number;
  ttl: number;
  confirmed: boolean;
  template: GrayPatch | null;
}

const centerOf = (r: Rect): [number, number] => [r[0] + r[2] / 2, r[1] + r[3] / 2];
const centerDistance = (a: Rect, b: Rect) => {
  const [ax, ay] = centerOf(a);
  const [bx, by] = centerOf(b);
  return Math.hypot(ax - bx, ay - by);
};
const rectAround = (cx: number, cy: number, w: number, h: number): Rect => [
  Math.trunc(cx - w / 2),
  Math.trunc(cy - h / 2),
  Math.trunc(w),
  Math.trunc(h),
];
const subPatch = (src: GrayPatch, x: number, y: number, w: number, h: number) => {
  const ox = x - src.x;
  const oy = y - src.y;
  if (ox < 0 || oy < 0 || ox + w > src.w || oy + h > src.h) return null;
  const data = new Uint8Array(w * h);
  for (let row = 0; row < h; row++) {
    const from = (oy + row) * src.w + ox;
    data.set(src.data.subarray(from, from + w), row * w);
  }
  return { data, w, h, x, y };
};

const grabTemplate = (gray: GraySource, rect: Rect) => {
  const x1 = Math.max(0, rect[0]);
  const y1 = Math.max(0, rect[1]);
  const x2 = Math.min(gray.width, rect[0] + rect[2]);
  const y2 = Math.min(gray.height, rect[1] + rect[3]);
  return x2 - x1 >= 8 && y2 - y1 >= 6 ? gray.region(x1, y1, x2, y2) : null;
};

export class BoxTracker {
  tracks = new Map<number, Track>();
  private nextId = 0;
  private minHits: number;
  private maxTtl: number;

  constructor(minHits = 1, maxTtl = 48) {
    this.minHits = minHits;
    this.maxTtl = maxTtl;
  }

  private expire() {
    for (const [id, track] of this.tracks) {
      if (track.ttl - 1 <= 0) this.tracks.delete(id);
      else track.ttl -= 1;
    }
  }

  update(detected: Rect[], gray?: GraySource): Rect[] {
    this.expire();
    const matched = new Set<number>();
    for (const t of this.tracks.values()) {
      const [tw, th] = [t.rect[2], t.rect[3]];
      const maxDist = Math.max(tw * 3, th * 4.5, 120);
      const pred: Rect = [t.rect[0] + t.velocity[0], t.rect[1] + t.velocity[1], tw, th];
      let bestScore = 0;
      let bestIdx = -1;
      detected.forEach((d, i) => {
        if (matched.has(i)) return;
        const overlap = Math.max(iou(t.rect, d), iou(pred, d));
        const dist = Math.min(centerDistance(t.rect, d), centerDistance(pred, d));
        if (overlap >= 0.08 || (dist < maxDist && overlap > 0.01)) {
          const score = overlap + Math.max(0, 1 - dist / maxDist);
          if (score > bestScore) {
            bestScore = score;
            bestIdx = i;
          }
        }
      });

      if (bestIdx < 0) {
        let [vx, vy] = t.velocity;
        if (Math.abs(vx) < 1 && Math.abs(vy) < 1) vx = vy = 0;
        t.center = [t.center[0] + vx, t.center[1] + vy];
        t.velocity = [vx * 0.8, vy * 0.8];
        t.rect = rectAround(t.center[0], t.center[1], t.size[0], t.size[1]);
        continue;
      }

      matched.add(bestIdx);
      const detection = detected[bestIdx];
      const [dx, dy, dw, dh] = detection;
      t.lastDetection = [dx, dy, dw, dh];
      const [dcx, dcy] = centerOf(detection);
      const [cx, cy] = t.center;
      const shift = Math.hypot(dcx - cx, dcy - cy);
      const [alpha, gain] = shift < 4 ? [0.25, 0] : shift < 20 ? [0.6, 0.6] : [0.85, 1];
      t.center = [alpha * dcx + (1 - alpha) * cx, alpha * dcy + (1 - alpha) * cy];
      const vx = clamp((dcx - cx) * gain, -45, 45);
      const vy = clamp((dcy - cy) * gain, -45, 45);
      t.velocity = [0.65 * vx + 0.35 * t.velocity[0], 0.65 * vy + 0.35 * t.velocity[1]];
      t.size = [Math.trunc(0.4 * dw + 0.6 * t.size[0]), Math.trunc(0.4 * dh + 0.6 * t.size[1])];
      t.rect = rectAround(t.center[0], t.center[1], t.size[0], t.size[1]);
      t.hits += 1;
      t.confirmed ||= t.hits >= this.minHits;
      t.ttl = t.confirmed ? this.maxTtl : 10;
      const template = gray && grabTemplate(gray, detection);
      if (template) t.template = template;
    }

    detected.forEach((d, i) => {
      if (matched.has(i)) return;
      this.tracks.set(++this.nextId, {
        lastDetection: [...d],
        rect: [...d],
        center: centerOf(d),
        velocity: [0, 0],
        size: [d[2], d[3]],
        hits: 1,
        ttl: 8,
        confirmed: this.minHits <= 1,
        template: gray ? grabTemplate(gray, d) : null,
      });
    });
    return this.current();
  }

  trackInterframe(gray?: GraySource): Rect[] {
    if (this.tracks.size === 0) return [];
    this.expire();
    for (const t of this.tracks.values()) {
      if (!t.confirmed) continue;
      const [cx, cy] = t.center;
      const [fw, fh] = t.size;
      let [vx, vy] = t.velocity;
      const tpl = t.template;
      let matched = false;
      if (gray && tpl && tpl.w >= 8 && tpl.h >= 6) {
        const padX = Math.max(25, Math.trunc(tpl.w * 0.6));
        const padY = Math.max(18, Math.trunc(tpl.h * 0.8));
        const roi = gray.region(
          cx + vx - tpl.w / 2 - padX,
          cy + vy - tpl.h / 2 - padY,
          cx + vx + tpl.w / 2 + padX,
          cy + vy + tpl.h / 2 + padY,
        );
        const match = roi && roi.w >= tpl.w && roi.h >= tpl.h ? matchPatch(roi, tpl) : null;
        if (roi && match && match.score >= 0.5) {
          matched = true;
          const mx = roi.x + match.x;
          const my = roi.y + match.y;
          const mcx = mx + tpl.w / 2;
          const mcy = my + tpl.h / 2;
          t.velocity = [
            0.7 * clamp(mcx - cx, -45, 45) + 0.3 * vx,
            0.7 * clamp(mcy - cy, -45, 45) + 0.3 * vy,
          ];
          t.center = [mcx, mcy];
          t.rect = rectAround(mcx, mcy, fw, fh);
          if (mx >= 0 && my >= 0 && mx + tpl.w <= gray.width && my + tpl.h <= gray.height) {
            t.template =
              subPatch(roi, mx, my, tpl.w, tpl.h) ??
              gray.region(mx, my, mx + tpl.w, my + tpl.h) ??
              tpl;
          }
        }
      }
      if (!matched) {
        if (Math.abs(vx) < 1 && Math.abs(vy) < 1) vx = vy = 0;
        t.center = [cx + vx, cy + vy];
        t.velocity = [vx * 0.9, vy * 0.9];
        t.rect = rectAround(t.center[0], t.center[1], fw, fh);
      }
    }
    return this.current();
  }

  refreshTemplates(gray: GraySource) {
    for (const t of this.tracks.values()) {
      if (t.confirmed) t.template = grabTemplate(gray, t.rect) ?? t.template;
    }
  }

  current(): Rect[] {
    return [...this.tracks.values()].filter((t) => t.confirmed).map((t) => [...t.rect]);
  }

  reset() {
    this.tracks.clear();
    this.nextId = 0;
  }
}

export const LOOKAHEAD_SEC = 0.5;

interface Sample {
  time: number;
  rect: Rect;
}

export class BoxTimeline {
  private episodes = new Map<string, Sample[][]>();
  private index: Map<string, Map<number, Sample[][]>> | null = null;
  private associations = new Map<
    string,
    {
      tracker: BoxTracker;
      lastTime: number;
      width: number;
      height: number;
      byId: Map<number, Sample[]>;
    }
  >();
  private ttl = 6;

  clear() {
    this.episodes.clear();
    this.associations.clear();
    this.index = null;
  }

  beginSegment(sampleIntervalSec: number) {
    this.associations.clear();
    this.ttl = Math.max(2, Math.ceil(LOOKAHEAD_SEC / sampleIntervalSec) + 1);
  }

  record(key: string, time: number, rects: Rect[], width: number, height: number) {
    let state = this.associations.get(key);
    if (
      !state ||
      state.width !== width ||
      state.height !== height ||
      time - state.lastTime > LOOKAHEAD_SEC
    ) {
      state = {
        tracker: new BoxTracker(1, this.ttl),
        lastTime: -Infinity,
        width,
        height,
        byId: new Map(),
      };
      this.associations.set(key, state);
    }
    if (time <= state.lastTime + 1e-7) return;
    this.index = null;
    state.lastTime = time;
    const previousHits = new Map([...state.tracker.tracks].map(([id, t]) => [id, t.hits]));
    state.tracker.update(rects);
    for (const [id, track] of state.tracker.tracks) {
      if (track.hits <= (previousHits.get(id) ?? 0)) continue;
      let samples = state.byId.get(id);
      if (!samples || time - samples[samples.length - 1].time > LOOKAHEAD_SEC) {
        samples = [];
        state.byId.set(id, samples);
        const episodes = this.episodes.get(key) ?? [];
        episodes.push(samples);
        this.episodes.set(key, episodes);
      }
      const [x, y, w, h] = track.lastDetection;
      samples.push({ time, rect: [x / width, y / height, w / width, h / height] });
    }
  }

  finalize() {
    this.index = new Map();
    for (const [key, episodes] of this.episodes) {
      const bins = new Map<number, Sample[][]>();
      for (const samples of episodes) {
        const start = Math.floor(samples[0].time - LOOKAHEAD_SEC - 1e-7);
        const end = Math.floor(samples[samples.length - 1].time + LOOKAHEAD_SEC + 1e-7);
        for (let second = start; second <= end; second++) {
          const bin = bins.get(second);
          if (bin) bin.push(samples);
          else bins.set(second, [samples]);
        }
      }
      this.index.set(key, bins);
    }
  }

  boxesAt(key: string, time: number, width: number, height: number): Rect[] {
    const candidates = this.index
      ? (this.index.get(key)?.get(Math.floor(time)) ?? [])
      : (this.episodes.get(key) ?? []);
    const boxes: Rect[] = [];
    for (const samples of candidates) {
      const first = samples[0];
      const last = samples[samples.length - 1];
      if (time < first.time - LOOKAHEAD_SEC - 1e-7 || time > last.time + LOOKAHEAD_SEC + 1e-7) {
        continue;
      }
      let rect: Rect;
      if (time <= first.time) rect = first.rect;
      else if (time >= last.time) rect = last.rect;
      else {
        let lo = 0;
        let hi = samples.length - 1;
        while (hi - lo > 1) {
          const mid = (lo + hi) >>> 1;
          if (samples[mid].time <= time) lo = mid;
          else hi = mid;
        }
        const a = samples[lo].rect;
        const b = samples[hi].rect;
        const x = Math.min(a[0], b[0]);
        const y = Math.min(a[1], b[1]);
        rect = [
          x,
          y,
          Math.max(a[0] + a[2], b[0] + b[2]) - x,
          Math.max(a[1] + a[3], b[1] + b[3]) - y,
        ];
      }
      boxes.push([rect[0] * width, rect[1] * height, rect[2] * width, rect[3] * height]);
    }
    return boxes;
  }
}

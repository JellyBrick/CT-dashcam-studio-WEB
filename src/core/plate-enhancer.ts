// Ported from core/plate_enhancer.py. Works on the Lab lightness channel only.
import { clamp } from 'es-toolkit';

import { gaussianBlur, gaussianKernel } from './image-ops';

import type { Rect } from './box-tracker';

const MIN_WIDTH = 30;
const MIN_HEIGHT = 12;
const TARGET_MEAN_L = 150;
const EMA = 0.75;
const PAD_RATIO = 0.05;

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v: number) =>
  clamp(Math.round((v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055) * 255), 0, 255);
const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
const fInv = (t: number) => {
  const cube = t ** 3;
  return cube > 0.008856 ? cube : (t - 16 / 116) / 7.787;
};

const LINEAR = Float32Array.from({ length: 256 }, (_, i) => toLinear(i));

const luminance = (r: number, g: number, b: number) => 0.212671 * r + 0.71516 * g + 0.072169 * b;
const lightness = (y: number, fy = f(y)) =>
  ((y > 0.008856 ? 116 * fy - 16 : 903.3 * y) * 255) / 100;

const toLab = (data: Uint8ClampedArray) => {
  const n = data.length / 4;
  const lab = { l: new Float32Array(n), a: new Float32Array(n), b: new Float32Array(n) };
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    const r = LINEAR[data[j]];
    const g = LINEAR[data[j + 1]];
    const b = LINEAR[data[j + 2]];
    const x = (0.412453 * r + 0.35758 * g + 0.180423 * b) / 0.950456;
    const y = luminance(r, g, b);
    const z = (0.019334 * r + 0.119193 * g + 0.950227 * b) / 1.088754;
    const fy = f(y);
    lab.l[i] = lightness(y, fy);
    lab.a[i] = 500 * (f(x) - fy);
    lab.b[i] = 200 * (fy - f(z));
  }
  return lab;
};

const meanLightness = (data: Uint8ClampedArray) => {
  const n = data.length / 4;
  let sum = 0;
  for (let j = 0; j < data.length; j += 4) {
    sum += Math.fround(
      lightness(luminance(LINEAR[data[j]], LINEAR[data[j + 1]], LINEAR[data[j + 2]])),
    );
  }
  return sum / (n || 1);
};

const writeLab = (l: Float32Array, a: Float32Array, b: Float32Array, out: Uint8ClampedArray) => {
  for (let i = 0, j = 0; i < l.length; i++, j += 4) {
    const lightness = (clamp(l[i], 0, 255) * 100) / 255;
    const fy = (lightness + 16) / 116;
    const x = fInv(fy + a[i] / 500) * 0.950456;
    const y = lightness > 7.9996 ? fy ** 3 : lightness / 903.3;
    const z = fInv(fy - b[i] / 200) * 1.088754;
    out[j] = fromLinear(3.240479 * x - 1.53715 * y - 0.498535 * z);
    out[j + 1] = fromLinear(-0.969256 * x + 1.875991 * y + 0.041556 * z);
    out[j + 2] = fromLinear(0.055648 * x - 0.204043 * y + 1.057311 * z);
  }
};

const rawGamma = (meanL: number) => {
  if (meanL >= 180) return clamp(1.1 + Math.min(0.3, (meanL - 180) / 160), 1.1, 1.4);
  const gamma =
    meanL > 1 && meanL < 254 ? Math.log(TARGET_MEAN_L / 255) / Math.log(meanL / 255) : 1;
  return clamp(gamma, 0.55, 1.15);
};

const BILATERAL_TAPS = Array.from({ length: 25 }, (_, i) => [(i % 5) - 2, Math.floor(i / 5) - 2])
  .filter(([dx, dy]) => dx * dx + dy * dy <= 4)
  .map(([dx, dy]) => ({ dx, dy, weight: Math.exp(-(dx * dx + dy * dy) / 50) }));

const bilateral = (src: Float32Array, w: number, h: number) => {
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const center = src[y * w + x];
      let acc = 0;
      let weights = 0;
      for (const { dx, dy, weight: spatial } of BILATERAL_TAPS) {
        const value = src[clamp(y + dy, 0, h - 1) * w + clamp(x + dx, 0, w - 1)];
        const weight = spatial * Math.exp(-((value - center) ** 2) / 1800);
        acc += value * weight;
        weights += weight;
      }
      out[y * w + x] = acc / weights;
    }
  }
  return out;
};

export const clahe = (src: Uint8Array, w: number, h: number, clipLimit: number, tiles = 4) => {
  const tw = Math.ceil(w / tiles);
  const th = Math.ceil(h / tiles);
  const tileArea = tw * th;
  const limit = Math.max(1, Math.trunc((clipLimit * tileArea) / 256));
  const luts = Array.from({ length: tiles * tiles }, (_, t) => {
    const hist = new Int32Array(256);
    const ox = (t % tiles) * tw;
    const oy = Math.floor(t / tiles) * th;
    for (let y = oy; y < oy + th; y++) {
      for (let x = ox; x < ox + tw; x++) {
        const rx = x < w ? x : 2 * w - 2 - x;
        const ry = y < h ? y : 2 * h - 2 - y;
        hist[src[clamp(ry, 0, h - 1) * w + clamp(rx, 0, w - 1)]]++;
      }
    }
    let excess = 0;
    for (let i = 0; i < 256; i++) {
      if (hist[i] > limit) {
        excess += hist[i] - limit;
        hist[i] = limit;
      }
    }
    const batch = Math.floor(excess / 256);
    let residual = excess - batch * 256;
    for (let i = 0; i < 256; i++) hist[i] += batch;
    const step = Math.max(Math.floor(256 / Math.max(1, residual)), 1);
    for (let i = 0; i < 256 && residual > 0; i += step, residual--) hist[i]++;
    const lut = new Uint8Array(256);
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += hist[i];
      lut[i] = clamp(Math.round((sum * 255) / tileArea), 0, 255);
    }
    return lut;
  });
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const ty = y / th - 0.5;
    const ty1 = Math.floor(ty);
    const ya = ty - ty1;
    const r1 = clamp(ty1, 0, tiles - 1) * tiles;
    const r2 = clamp(ty1 + 1, 0, tiles - 1) * tiles;
    for (let x = 0; x < w; x++) {
      const tx = x / tw - 0.5;
      const tx1 = Math.floor(tx);
      const xa = tx - tx1;
      const c1 = clamp(tx1, 0, tiles - 1);
      const c2 = clamp(tx1 + 1, 0, tiles - 1);
      const v = src[y * w + x];
      out[y * w + x] = Math.round(
        (luts[r1 + c1][v] * (1 - xa) + luts[r1 + c2][v] * xa) * (1 - ya) +
          (luts[r2 + c1][v] * (1 - xa) + luts[r2 + c2][v] * xa) * ya,
      );
    }
  }
  return out;
};

const enhanceLightness = (l: Float32Array, w: number, h: number, meanL: number, gamma: number) => {
  const smoothed = bilateral(l, w, h);
  const equalized = clahe(
    Uint8Array.from(smoothed, (v) => clamp(Math.round(v), 0, 255)),
    w,
    h,
    meanL >= 180 ? 1 : 2,
  );
  const graded = Float32Array.from(equalized, (v) => 255 * (v / 255) ** gamma);
  const blurred = gaussianBlur(graded, w, h, gaussianKernel(9, 1.2));
  return graded.map((v, i) => v * 1.85 - blurred[i] * 0.85);
};

let scratch: HTMLCanvasElement | null = null;
let target: HTMLCanvasElement | null = null;

const resample = (data: ImageData, w: number, h: number) => {
  scratch ??= document.createElement('canvas');
  target ??= document.createElement('canvas');
  const ctx = scratch.getContext('2d', { willReadFrequently: true })!;
  scratch.width = data.width;
  scratch.height = data.height;
  ctx.putImageData(data, 0, 0);
  target.width = w;
  target.height = h;
  const outCtx = target.getContext('2d', { willReadFrequently: true })!;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.drawImage(scratch, 0, 0, w, h);
  return outCtx.getImageData(0, 0, w, h);
};

const featherMask = (w: number, h: number) => {
  const pad = Math.max(2, Math.floor(Math.min(w, h) / 10));
  const mask = new Float32Array(w * h);
  if (h <= pad * 2 || w <= pad * 2) return mask.fill(1);
  for (let y = pad; y < h - pad; y++) mask.fill(1, y * w + pad, y * w + w - pad);
  const blurred = gaussianBlur(mask, w, h, gaussianKernel(pad * 2 + 1, pad / 2));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) blurred[y * w + x] = 0;
    }
  }
  return gaussianBlur(blurred, w, h, gaussianKernel(3, 0.5)).map((v) => clamp(v, 0, 1));
};

export class PlateEnhancer {
  private states: [number, number, number][] = [];

  reset() {
    this.states = [];
  }

  private smoothedGamma(cx: number, cy: number, size: number, raw: number) {
    let best: number | null = null;
    let bestDistance = Math.max(30, size * 1.5);
    for (const [px, py, gamma] of this.states) {
      const distance = Math.hypot(px - cx, py - cy);
      if (distance < bestDistance) {
        best = gamma;
        bestDistance = distance;
      }
    }
    return best === null ? raw : EMA * best + (1 - EMA) * raw;
  }

  apply(ctx: CanvasRenderingContext2D, boxes: Rect[]) {
    const { width, height } = ctx.canvas;
    const next: [number, number, number][] = [];
    for (const [rx, ry, rw, rh] of boxes) {
      if (rw < MIN_WIDTH || rh < MIN_HEIGHT) continue;
      const x1 = Math.max(0, Math.trunc(rx - rw * PAD_RATIO));
      const y1 = Math.max(0, Math.trunc(ry - rh * PAD_RATIO));
      const bw = Math.min(width, Math.trunc(rx + rw + rw * PAD_RATIO)) - x1;
      const bh = Math.min(height, Math.trunc(ry + rh + rh * PAD_RATIO)) - y1;
      if (bw < MIN_WIDTH || bh < MIN_HEIGHT) continue;

      const original = ctx.getImageData(x1, y1, bw, bh);
      const meanL = meanLightness(original.data);
      const gamma = this.smoothedGamma(x1 + bw / 2, y1 + bh / 2, bw, rawGamma(meanL));
      next.push([x1 + bw / 2, y1 + bh / 2, gamma]);

      const large = resample(original, bw * 2, bh * 2);
      const lab = toLab(large.data);
      writeLab(enhanceLightness(lab.l, bw * 2, bh * 2, meanL, gamma), lab.a, lab.b, large.data);
      const enhanced = resample(large, bw, bh).data;
      const mask = featherMask(bw, bh);
      const blended = new ImageData(bw, bh);
      for (let i = 0, j = 0; i < mask.length; i++, j += 4) {
        for (let c = 0; c < 3; c++) {
          blended.data[j + c] = enhanced[j + c] * mask[i] + original.data[j + c] * (1 - mask[i]);
        }
        blended.data[j + 3] = 255;
      }
      ctx.putImageData(blended, x1, y1);
    }
    this.states = next;
  }
}

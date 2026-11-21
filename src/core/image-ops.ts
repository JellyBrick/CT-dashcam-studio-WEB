// Small OpenCV equivalents used by the plate finder and enhancer (8-bit, single channel).
import { toGray } from './box-tracker';

export interface Pixels {
  data: Uint8ClampedArray;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Hsv {
  h: Uint8Array;
  s: Uint8Array;
  v: Uint8Array;
}

export const crop = (src: Pixels, x1: number, y1: number, x2: number, y2: number): Pixels => {
  const cx1 = Math.max(src.x, Math.trunc(x1));
  const cy1 = Math.max(src.y, Math.trunc(y1));
  const w = Math.max(0, Math.min(src.x + src.w, Math.trunc(x2)) - cx1);
  const h = Math.max(0, Math.min(src.y + src.h, Math.trunc(y2)) - cy1);
  const data = new Uint8ClampedArray(w * h * 4);
  for (let row = 0; row < h; row++) {
    const from = ((cy1 - src.y + row) * src.w + (cx1 - src.x)) * 4;
    data.set(src.data.subarray(from, from + w * 4), row * w * 4);
  }
  return { data, x: cx1, y: cy1, w, h };
};

export const grayOf = ({ data, w, h }: Pixels) => {
  const out = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < out.length; i++, j += 4) {
    out[i] = Math.round(toGray(data[j], data[j + 1], data[j + 2]));
  }
  return out;
};

export const hsvOf = ({ data, w, h }: Pixels): Hsv => {
  const n = w * h;
  const out = { h: new Uint8Array(n), s: new Uint8Array(n), v: new Uint8Array(n) };
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    const r = data[j];
    const g = data[j + 1];
    const b = data[j + 2];
    const v = Math.max(r, g, b);
    const diff = v - Math.min(r, g, b);
    let hue = 0;
    if (diff > 0) {
      if (v === r) hue = (60 * (g - b)) / diff;
      else if (v === g) hue = 120 + (60 * (b - r)) / diff;
      else hue = 240 + (60 * (r - g)) / diff;
      if (hue < 0) hue += 360;
    }
    out.h[i] = Math.round(hue / 2) % 180;
    out.s[i] = v === 0 ? 0 : Math.round((255 * diff) / v);
    out.v[i] = v;
  }
  return out;
};

export const inRange = (
  hsv: Hsv,
  [h1, s1, v1]: [number, number, number],
  [h2, s2, v2]: [number, number, number],
) => {
  const out = new Uint8Array(hsv.h.length);
  for (let i = 0; i < out.length; i++) {
    const h = hsv.h[i];
    const s = hsv.s[i];
    const v = hsv.v[i];
    if (h >= h1 && h <= h2 && s >= s1 && s <= s2 && v >= v1 && v <= v2) out[i] = 255;
  }
  return out;
};

export const either = (...masks: Uint8Array[]) => {
  const out = new Uint8Array(masks[0].length);
  for (const mask of masks) for (let i = 0; i < out.length; i++) out[i] |= mask[i];
  return out;
};

export const countNonZero = (mask: Uint8Array) => {
  let count = 0;
  for (const value of mask) if (value) count++;
  return count;
};

const reflect101 = (i: number, n: number) => {
  if (n === 1) return 0;
  let k = i;
  while (k < 0 || k >= n) k = k < 0 ? -k : 2 * n - 2 - k;
  return k;
};

export const sobel = (src: Uint8Array, w: number, h: number, axis: 'x' | 'y') => {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const ym = reflect101(y - 1, h) * w;
    const y0 = y * w;
    const yp = reflect101(y + 1, h) * w;
    for (let x = 0; x < w; x++) {
      const xm = reflect101(x - 1, w);
      const xp = reflect101(x + 1, w);
      out[y0 + x] =
        axis === 'x'
          ? src[ym + xp] -
            src[ym + xm] +
            2 * (src[y0 + xp] - src[y0 + xm]) +
            src[yp + xp] -
            src[yp + xm]
          : src[yp + xm] -
            src[ym + xm] +
            2 * (src[yp + x] - src[ym + x]) +
            src[yp + xp] -
            src[ym + xp];
    }
  }
  return out;
};

export const absSaturate = (src: Float32Array) => {
  const out = new Uint8Array(src.length);
  for (let i = 0; i < src.length; i++) out[i] = Math.min(255, Math.round(Math.abs(src[i])));
  return out;
};

export const otsuBinary = (src: Uint8Array) => {
  const hist = new Float64Array(256);
  for (const value of src) hist[value]++;
  const total = src.length;
  let sumAll = 0;
  for (let i = 0; i < 256; i++) sumAll += i * hist[i];
  let sumBack = 0;
  let weightBack = 0;
  let best = 0;
  let threshold = 0;
  for (let t = 0; t < 256; t++) {
    weightBack += hist[t];
    if (weightBack === 0) continue;
    const weightFore = total - weightBack;
    if (weightFore === 0) break;
    sumBack += t * hist[t];
    const meanBack = sumBack / weightBack;
    const meanFore = (sumAll - sumBack) / weightFore;
    const between = weightBack * weightFore * (meanBack - meanFore) ** 2;
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  const out = new Uint8Array(total);
  for (let i = 0; i < total; i++) out[i] = src[i] > threshold ? 255 : 0;
  return out;
};

const dilateRows = (src: Uint8Array, w: number, h: number, size: number) => {
  const padded = w + size - 1;
  const line = new Uint8Array(padded);
  const prefix = new Uint8Array(padded);
  const suffix = new Uint8Array(padded);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    line.set(src.subarray(y * w, y * w + w), size >> 1);
    for (let start = 0; start < padded; start += size) {
      const end = Math.min(padded, start + size);
      let high = 0;
      for (let i = start; i < end; i++) prefix[i] = high = line[i] > high ? line[i] : high;
      high = 0;
      for (let i = end - 1; i >= start; i--) suffix[i] = high = line[i] > high ? line[i] : high;
    }
    for (let x = 0, o = y * w; x < w; x++, o++) {
      out[o] = suffix[x] > prefix[x + size - 1] ? suffix[x] : prefix[x + size - 1];
    }
  }
  return out;
};

const dilateColumns = (src: Uint8Array, w: number, h: number, size: number) => {
  const anchor = size >> 1;
  const padded = h + size - 1;
  const prefix = new Uint8Array(padded * w);
  const suffix = new Uint8Array(padded * w);
  const copyRow = (target: Uint8Array, p: number) => {
    const y = p - anchor;
    if (y >= 0 && y < h) target.set(src.subarray(y * w, y * w + w), p * w);
  };
  const raise = (target: Uint8Array, row: number, from: number) => {
    for (let x = 0; x < w; x++) {
      if (target[from + x] > target[row + x]) target[row + x] = target[from + x];
    }
  };
  for (let start = 0; start < padded; start += size) {
    const end = Math.min(padded, start + size);
    for (let p = start; p < end; p++) {
      copyRow(prefix, p);
      if (p > start) raise(prefix, p * w, (p - 1) * w);
    }
    for (let p = end - 1; p >= start; p--) {
      copyRow(suffix, p);
      if (p < end - 1) raise(suffix, p * w, (p + 1) * w);
    }
  }
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const a = y * w;
    const b = (y + size - 1) * w;
    for (let x = 0; x < w; x++)
      out[a + x] = suffix[a + x] > prefix[b + x] ? suffix[a + x] : prefix[b + x];
  }
  return out;
};

const invert = (src: Uint8Array) => {
  const out = new Uint8Array(src.length);
  for (let i = 0; i < src.length; i++) out[i] = 255 - src[i];
  return out;
};

const dilate = (src: Uint8Array, w: number, h: number, kw: number, kh: number) =>
  dilateColumns(dilateRows(src, w, h, kw), w, h, kh);

export const morphClose = (src: Uint8Array, w: number, h: number, kw: number, kh: number) =>
  invert(dilate(invert(dilate(src, w, h, kw, kh)), w, h, kw, kh));

export interface Component {
  x: number;
  y: number;
  w: number;
  h: number;
  area: number;
}

export const components = (mask: Uint8Array, w: number, h: number): Component[] => {
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const found: Component[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    seen[start] = 1;
    stack.push(start);
    let [x1, y1, x2, y2, area] = [w, h, 0, 0, 0];
    while (stack.length) {
      const i = stack.pop()!;
      const x = i % w;
      const y = (i - x) / w;
      area++;
      x1 = Math.min(x1, x);
      y1 = Math.min(y1, y);
      x2 = Math.max(x2, x);
      y2 = Math.max(y2, y);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if (mask[j] && !seen[j]) {
            seen[j] = 1;
            stack.push(j);
          }
        }
      }
    }
    found.push({ x: x1, y: y1, w: x2 - x1 + 1, h: y2 - y1 + 1, area });
  }
  return found;
};

export const gaussianKernel = (size: number, sigma = 0) => {
  const s = sigma > 0 ? sigma : 0.3 * ((size - 1) * 0.5 - 1) + 0.8;
  const half = (size - 1) / 2;
  const kernel = Array.from({ length: size }, (_, i) => Math.exp(-((i - half) ** 2) / (2 * s * s)));
  const total = kernel.reduce((a, b) => a + b, 0);
  return kernel.map((value) => value / total);
};

export const gaussianBlur = (src: ArrayLike<number>, w: number, h: number, kernel: number[]) => {
  const half = (kernel.length - 1) / 2;
  const rows = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = 0; k < kernel.length; k++) {
        acc += kernel[k] * src[y * w + Math.min(w - 1, Math.max(0, x + k - half))];
      }
      rows[y * w + x] = acc;
    }
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = 0; k < kernel.length; k++) {
        acc += kernel[k] * rows[Math.min(h - 1, Math.max(0, y + k - half)) * w + x];
      }
      out[y * w + x] = acc;
    }
  }
  return out;
};

export const adaptiveThresholdInv = (
  src: Uint8Array,
  w: number,
  h: number,
  block: number,
  c: number,
) => {
  const mean = gaussianBlur(src, w, h, gaussianKernel(block));
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = src[i] - Math.round(mean[i]) > -c ? 0 : 255;
  return out;
};

export const histogram = (values: Uint8Array) => {
  const hist = new Uint32Array(256);
  for (const value of values) hist[value]++;
  return hist;
};

const valueAtRank = (hist: Uint32Array, rank: number) => {
  let seen = 0;
  for (let value = 0; value < 255; value++) {
    seen += hist[value];
    if (seen > rank) return value;
  }
  return 255;
};

export const percentile = (hist: Uint32Array, q: number) => {
  let total = 0;
  for (const count of hist) total += count;
  if (total === 0) return 0;
  const rank = (q / 100) * (total - 1);
  const lo = Math.floor(rank);
  const low = valueAtRank(hist, lo);
  const high = valueAtRank(hist, Math.min(total - 1, lo + 1));
  return low + (high - low) * (rank - lo);
};

export const statsWhere = (hist: Uint32Array, keep: (value: number) => boolean) => {
  let count = 0;
  let sum = 0;
  let sumSq = 0;
  for (let value = 0; value < 256; value++) {
    if (hist[value] === 0 || !keep(value)) continue;
    count += hist[value];
    sum += value * hist[value];
    sumSq += value * value * hist[value];
  }
  const n = count || 1;
  const mean = sum / n;
  return { count, mean, std: Math.sqrt(Math.max(0, sumSq / n - mean * mean)) };
};

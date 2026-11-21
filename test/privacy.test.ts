import { describe, expect, it } from 'vitest';

import {
  BoxTimeline,
  BoxTracker,
  type GraySource,
  matchTemplateNcc,
  nms,
  type Rect,
} from '../src/core/box-tracker';
import { histogram, morphClose, percentile, statsWhere } from '../src/core/image-ops';
import { countChangedPixels, mergeMotionTimes } from '../src/core/motion-scanner';
import { verifyDigitSequence } from '../src/core/plate-finder';
import { decodeYuNet } from '../src/core/privacy-models';

const noisyFrame = (w: number, h: number, bx: number, by: number, bw = 40, bh = 48) => {
  const data = new Uint8Array(w * h);
  let seed = 12345;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    data[i] = 90 + (seed % 20);
  }
  let blob = 777;
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      blob = (blob * 1103515245 + 12345) & 0x7fffffff;
      data[(by + y) * w + bx + x] = (blob >> 8) % 256;
    }
  }
  return data;
};

const graySource = (data: Uint8Array, w: number, h: number): GraySource => ({
  width: w,
  height: h,
  region: (x1, y1, x2, y2) => {
    const rx = Math.max(0, Math.floor(x1));
    const ry = Math.max(0, Math.floor(y1));
    const pw = Math.min(w, Math.ceil(x2)) - rx;
    const ph = Math.min(h, Math.ceil(y2)) - ry;
    if (pw <= 0 || ph <= 0) return null;
    const out = new Uint8Array(pw * ph);
    for (let y = 0; y < ph; y++)
      out.set(data.subarray((ry + y) * w + rx, (ry + y) * w + rx + pw), y * pw);
    return { data: out, w: pw, h: ph, x: rx, y: ry };
  },
});

describe('template matching and suppression', () => {
  it('finds a template at its exact offset', () => {
    const img = noisyFrame(200, 160, 70, 55);
    const tpl = new Uint8Array(40 * 48);
    for (let y = 0; y < 48; y++)
      tpl.set(img.subarray((55 + y) * 200 + 70, (55 + y) * 200 + 110), y * 40);
    const match = matchTemplateNcc(img, 200, 160, tpl, 40, 48)!;
    expect([match.x, match.y]).toEqual([70, 55]);
    expect(match.score).toBeGreaterThan(0.99);
  });

  it('keeps the best of overlapping boxes', () => {
    const boxes: Rect[] = [
      [0, 0, 10, 10],
      [1, 1, 10, 10],
      [50, 50, 10, 10],
    ];
    expect(nms(boxes, [0.6, 0.9, 0.5], 0.3)).toEqual([1, 2]);
  });
});

describe('YuNet decoding', () => {
  it('decodes one anchor with OpenCV FaceDetectorYN math', () => {
    const outputs: Record<string, Float32Array> = {};
    for (const stride of [8, 16, 32]) {
      const n = (64 / stride) ** 2;
      outputs[`cls_${stride}`] = new Float32Array(n);
      outputs[`obj_${stride}`] = new Float32Array(n);
      outputs[`bbox_${stride}`] = new Float32Array(n * 4);
    }
    const i = 2 * 8 + 3;
    outputs.cls_8[i] = 0.81;
    outputs.obj_8[i] = 0.81;
    outputs.bbox_8.set([0.5, 0.25, Math.log(2), Math.log(3)], i * 4);
    const [[x, y, w, h]] = decodeYuNet(outputs, 64, 64);
    expect([x, y, w, h].map((v) => Math.round(v * 1000) / 1000)).toEqual([20, 6, 16, 24]);
  });
});

describe('BoxTracker', () => {
  it('follows a moving patch between detections by template matching', () => {
    const tracker = new BoxTracker(1, 48);
    tracker.update([[70, 55, 40, 48]], graySource(noisyFrame(240, 180, 70, 55), 240, 180));
    const [rect] = tracker.trackInterframe(graySource(noisyFrame(240, 180, 82, 60), 240, 180));
    expect(rect[0]).toBeCloseTo(82, -1);
    expect(rect[1]).toBeCloseTo(60, -1);
  });

  it('follows a large box to the exact pixel through several image sizes', () => {
    const tracker = new BoxTracker(1, 48);
    tracker.update(
      [[300, 200, 200, 240]],
      graySource(noisyFrame(900, 700, 300, 200, 200, 240), 900, 700),
    );
    const [rect] = tracker.trackInterframe(
      graySource(noisyFrame(900, 700, 313, 191, 200, 240), 900, 700),
    );
    expect([rect[0], rect[1]]).toEqual([313, 191]);
  });
});

describe('plate image helpers', () => {
  const random = (seed: number) => () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const slowClose = (src: Uint8Array, w: number, h: number, kw: number, kh: number) => {
    const pass = (img: Uint8Array, max: boolean) => {
      const window = (x: number, y: number) => {
        let value = max ? 0 : 255;
        for (let yy = y - (kh >> 1); yy < y - (kh >> 1) + kh; yy++) {
          for (let xx = x - (kw >> 1); xx < x - (kw >> 1) + kw; xx++) {
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            value = max ? Math.max(value, img[yy * w + xx]) : Math.min(value, img[yy * w + xx]);
          }
        }
        return value;
      };
      return Uint8Array.from({ length: w * h }, (_, i) => window(i % w, Math.floor(i / w)));
    };
    return pass(pass(src, true), false);
  };

  it('closes gaps the same way as a direct window scan', () => {
    const r = random(3);
    for (let k = 0; k < 20; k++) {
      const w = 1 + Math.floor(r() * 60);
      const h = 1 + Math.floor(r() * 40);
      const kw = Math.floor(r() * 12) * 2 + 1;
      const kh = Math.floor(r() * 4) * 2 + 1;
      const mask = Uint8Array.from({ length: w * h }, () => (r() < 0.3 ? 255 : 0));
      expect(morphClose(mask, w, h, kw, kh)).toEqual(slowClose(mask, w, h, kw, kh));
    }
  });

  it('reads percentiles and subset statistics from a histogram', () => {
    const r = random(5);
    const values = Uint8Array.from({ length: 999 }, () => Math.floor(r() * 256));
    const sorted = Array.from(values).sort((a, b) => a - b);
    const hist = histogram(values);
    const rank = 0.45 * (sorted.length - 1);
    const lo = Math.floor(rank);
    expect(percentile(hist, 45)).toBe(sorted[lo] + (sorted[lo + 1] - sorted[lo]) * (rank - lo));
    const bright = sorted.filter((value) => value >= 128);
    const stats = statsWhere(hist, (value) => value >= 128);
    expect(stats.count).toBe(bright.length);
    expect(stats.mean).toBeCloseTo(bright.reduce((a, b) => a + b, 0) / bright.length, 9);
  });
});

describe('BoxTimeline look-ahead', () => {
  const box: Rect = [100, 100, 40, 50];
  const timeline = () => {
    const t = new BoxTimeline();
    t.beginSegment(0.1);
    t.record('front:face', 1, [box], 1000, 1000);
    return t;
  };

  it('covers a detection from 0.5 seconds before until 0.5 seconds after', () => {
    const t = timeline();
    expect(t.boxesAt('front:face', 0.499, 1000, 1000)).toEqual([]);
    expect(t.boxesAt('front:face', 0.5, 1000, 1000)).toEqual([box]);
    expect(t.boxesAt('front:face', 1.5, 1000, 1000)).toEqual([box]);
    expect(t.boxesAt('front:face', 1.501, 1000, 1000)).toEqual([]);
  });

  it('covers both positions while a box moves and keeps cameras apart', () => {
    const t = timeline();
    t.record('front:face', 1.1, [[110, 100, 40, 50]], 1000, 1000);
    const [rect] = t.boxesAt('front:face', 1.05, 1000, 1000);
    expect(rect[0]).toBe(100);
    expect(rect[0] + rect[2]).toBeCloseTo(150);
    expect(t.boxesAt('back:face', 1.05, 1000, 1000)).toEqual([]);
  });

  it('keeps the same answers after indexing', () => {
    const t = timeline();
    const times = [0.49, 0.5, 1, 1.5, 1.51];
    const before = times.map((time) => t.boxesAt('front:face', time, 1000, 1000));
    t.finalize();
    expect(times.map((time) => t.boxesAt('front:face', time, 1000, 1000))).toEqual(before);
  });
});

describe('motion scanning', () => {
  it('counts pixels that changed by more than the threshold', () => {
    expect(countChangedPixels(Uint8Array.of(10, 40, 70), Uint8Array.of(10, 10, 10), 25)).toBe(2);
  });

  it('merges nearby motion into padded events', () => {
    expect(mergeMotionTimes([10, 12, 30], 60)).toEqual([
      { startSec: 8.5, endSec: 14 },
      { startSec: 28.5, endSec: 32 },
    ]);
    expect(mergeMotionTimes([0.5, 59], 60)).toEqual([
      { startSec: 0, endSec: 2.5 },
      { startSec: 57.5, endSec: 60 },
    ]);
  });
});

describe('Korean plate checks', () => {
  const plate = (digits: boolean) => {
    const w = 120;
    const h = 30;
    const gray = new Uint8Array(w * h).fill(220);
    if (digits) {
      for (let d = 0; d < 4; d++) {
        const x0 = 20 + d * 18;
        for (let y = 5; y < 25; y++) {
          for (let x = x0; x < x0 + 10; x++) {
            if (y < 7 || y > 22 || x < x0 + 2 || x > x0 + 7) gray[y * w + x] = 30;
          }
        }
      }
    }
    return { gray, w, h };
  };

  it('accepts a row of evenly sized characters and rejects a blank patch', () => {
    const withDigits = plate(true);
    const blank = plate(false);
    expect(verifyDigitSequence(withDigits.gray, withDigits.w, withDigits.h)).toBe(true);
    expect(verifyDigitSequence(blank.gray, blank.w, blank.h)).toBe(false);
  });
});

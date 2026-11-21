// Ported from core/privacy_filter.py (_detect_plates vehicle branch and the Korean plate checks).
import { clamp } from 'es-toolkit';

import { nms, type Rect } from './box-tracker';
import {
  absSaturate,
  adaptiveThresholdInv,
  components,
  countNonZero,
  crop,
  either,
  grayOf,
  histogram,
  type Hsv,
  hsvOf,
  inRange,
  morphClose,
  otsuBinary,
  percentile,
  type Pixels,
  sobel,
  statsWhere,
} from './image-ops';

const redMask = (hsv: Hsv) =>
  either(inRange(hsv, [0, 35, 45], [14, 255, 255]), inRange(hsv, [165, 35, 45], [180, 255, 255]));

const maskedMean = (values: Uint8Array, mask: Uint8Array) => {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    if (mask[i] === 0) continue;
    sum += values[i];
    count++;
  }
  return sum / (count || 1);
};

export const verifyPlateGeometry = (
  gray: Uint8Array,
  w: number,
  h: number,
  hist = histogram(gray),
) => {
  if (h < 8 || w < 24) return false;
  const sobelY = sobel(gray, w, h, 'y');
  const rowMean = (from: number, to: number) => {
    let sum = 0;
    for (let i = from * w; i < to * w; i++) sum += Math.abs(sobelY[i]);
    return sum / Math.max(1, (to - from) * w);
  };
  const top = rowMean(0, Math.max(2, Math.trunc(h * 0.25)));
  const bottom = rowMean(Math.min(h - 1, Math.trunc(h * 0.75)), h);
  if (top + bottom < 18) return false;
  const brightThreshold = percentile(hist, 45);
  const background = statsWhere(hist, (value) => value >= brightThreshold);
  return background.count === 0 || background.std <= 42;
};

export const verifyDigitSequence = (gray: Uint8Array, w: number, h: number) => {
  if (h < 8 || w < 24) return false;
  let min = 255;
  let max = 0;
  for (const value of gray) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  if (max - min < 38) return false;
  const binary = adaptiveThresholdInv(gray, w, h, h >= 16 ? 15 : 9, 6);
  const found = components(binary, w, h);
  if (found.length + 1 < 4 || found.length + 1 > 35) return false;
  const digits = found
    .filter((c) => {
      const aspect = c.w / Math.max(1, c.h);
      const fill = c.area / Math.max(1, c.w * c.h);
      return (
        c.h >= 0.2 * h &&
        c.h <= 0.95 * h &&
        aspect >= 0.15 &&
        aspect <= 0.9 &&
        fill >= 0.15 &&
        fill <= 0.85
      );
    })
    .sort((a, b) => a.x - b.x);
  if (digits.length < 3) return false;

  for (let i = 0; i < digits.length; i++) {
    const first = digits[i];
    const row = [first];
    const firstCy = first.y + first.h / 2;
    for (const next of digits.slice(i + 1)) {
      if (Math.abs(firstCy - (next.y + next.h / 2)) > Math.max(3, first.h * 0.35)) continue;
      const last = row[row.length - 1];
      const gap = next.x - (last.x + last.w);
      if (gap >= 1 && gap <= Math.max(45, Math.trunc(first.h * 2.5))) row.push(next);
    }
    if (row.length < 3) continue;
    const heights = row.map((c) => c.h).sort((a, b) => a - b);
    const uniform = heights.slice(0, -2).some((_, k) => {
      const window = heights.slice(k, k + 3);
      return window[2] <= window[0] * 1.45 || window[2] - window[0] <= 2;
    });
    const last = row[row.length - 1];
    if (uniform && last.x + last.w - row[0].x >= Math.max(14, Math.trunc(w * 0.25))) return true;
  }
  return false;
};

export const verifyKoreanPlateProfile = (
  hsv: Hsv,
  gray: Uint8Array,
  w: number,
  h: number,
  aspect: number,
  redPixels: number,
) => {
  const total = w * h;
  if (total <= 0 || aspect < 1.45 || aspect > 6.8 || redPixels / total >= 0.55) return false;
  const hist = histogram(gray);
  if (!verifyPlateGeometry(gray, w, h, hist)) return false;

  const standard = either(
    inRange(hsv, [0, 0, 50], [180, 65, 255]),
    inRange(hsv, [13, 35, 50], [42, 255, 255]),
    inRange(hsv, [88, 25, 75], [132, 255, 255]),
    inRange(hsv, [45, 35, 90], [85, 255, 255]),
  );
  if (countNonZero(standard) / total >= 0.26) {
    const textThreshold = percentile(hist, 85) - 16;
    const dark = statsWhere(hist, (value) => value < textThreshold);
    const darkRatio = dark.count / total;
    if (darkRatio >= 0.03 && darkRatio <= 0.8 && maskedMean(gray, standard) - dark.mean >= 8) {
      return true;
    }
  }

  if (aspect >= 1.3 && aspect <= 2.4) {
    const darkGreen = inRange(hsv, [48, 80, 30], [82, 255, 120]);
    if (countNonZero(darkGreen) / total >= 0.45) {
      const whiteThreshold = percentile(hist, 20) + 20;
      const whiteRatio = statsWhere(hist, (value) => value > whiteThreshold).count / total;
      if (whiteRatio >= 0.04 && whiteRatio <= 0.5) return true;
    }
  }
  return false;
};

export const plateSearchArea = (vehicle: Rect): Rect => {
  const [vx, vy, vw, vh] = vehicle.map(Math.trunc);
  return [vx, vy, vw, vh + Math.ceil(vw * 0.06)];
};

export const findPlateInVehicle = (
  vehicle: Rect,
  frameW: number,
  read: (area: Rect) => Pixels,
): Rect | null => {
  const [vx, vy, vw, vh] = vehicle.map(Math.trunc);
  if ((vx <= 8 && vw < 280) || (vx + vw >= frameW - 8 && vw < 280)) return null;
  if (vw / vh > 2.2) return null;

  const frame = read(plateSearchArea(vehicle));
  const roi = crop(
    frame,
    vx + Math.trunc(vw * 0.2),
    vy + Math.trunc(vh * 0.28),
    vx + Math.trunc(vw * 0.8),
    vy + Math.trunc(vh * 0.96),
  );
  if (roi.w < 18 || roi.h < 8) return null;
  const gray = grayOf(roi);
  const hsv = hsvOf(roi);
  const kw = clamp(Math.trunc(vw * 0.06) | 1, 7, 23);
  const kh = clamp(Math.trunc(vh * 0.02) | 1, 3, 7);
  const edges = morphClose(
    otsuBinary(absSaturate(sobel(gray, roi.w, roi.h, 'x'))),
    roi.w,
    roi.h,
    kw,
    kh,
  );
  const colors = morphClose(
    either(
      inRange(hsv, [0, 0, 70], [180, 50, 255]),
      inRange(hsv, [13, 30, 70], [38, 255, 255]),
      inRange(hsv, [85, 20, 70], [130, 255, 255]),
    ),
    roi.w,
    roi.h,
    kw,
    kh + 2,
  );
  const grayHist = histogram(gray);
  const bright = [60, 75, 90].flatMap((q) => {
    const threshold = percentile(grayHist, q);
    return components(
      gray.map((value) => (value >= threshold ? 255 : 0)),
      roi.w,
      roi.h,
    );
  });
  const candidates = [
    ...components(edges, roi.w, roi.h),
    ...components(colors, roi.w, roi.h),
    ...bright,
  ];

  const carCx = vx + vw / 2;
  const tried = new Set<string>();
  let best: Rect | null = null;
  let bestScore = -1;
  for (const { x, y, w: bw, h: bh } of candidates) {
    if (bw < 14 || bh < 4) continue;
    const gx = roi.x + x;
    let gy = roi.y + y;
    const offset = Math.abs(gx + bw / 2 - carCx) / vw;
    if (offset > 0.14) continue;
    const widthRatio = bw / vw;
    if (widthRatio < 0.15 || widthRatio > 0.33) continue;
    let ph = bh;
    let aspect = bw / ph;
    if (aspect > 5.2) {
      ph = Math.trunc(bw / 3.8);
      gy = Math.max(0, gy - Math.trunc(ph * 0.4));
      aspect = bw / ph;
    }
    if (aspect < 1.8 || aspect > 5.8) continue;
    const key = `${gx},${gy},${bw},${ph}`;
    if (tried.has(key)) continue;
    tried.add(key);

    const patch = crop(frame, gx, gy, gx + bw, gy + ph);
    if (patch.w === 0 || patch.h === 0) continue;
    const pHsv = hsvOf(patch);
    const redPixels = countNonZero(redMask(pHsv));
    if (redPixels / (bw * ph) > 0.4) continue;
    const pGray = grayOf(patch);
    if (!verifyDigitSequence(pGray, patch.w, patch.h)) continue;
    const isProfile = verifyKoreanPlateProfile(pHsv, pGray, patch.w, patch.h, aspect, redPixels);
    const score = bw * ph * (1 - offset * 2.5) * (isProfile ? 2.5 : 1);
    if (score > bestScore) {
      bestScore = score;
      best = [gx, gy, bw, ph];
    }
  }
  if (!best) return null;
  const padX = Math.max(1, Math.trunc(best[2] * 0.03));
  const padY = Math.max(1, Math.trunc(best[3] * 0.08));
  const rx = Math.max(0, best[0] - padX);
  const ry = Math.max(0, best[1] - padY);
  return [rx, ry, best[2] + padX * 2, best[3] + padY * 2];
};

export const findPlates = (
  vehicles: Rect[],
  frameW: number,
  read: (area: Rect) => Pixels,
): Rect[] => {
  const plates = vehicles.flatMap((vehicle) => {
    const plate = findPlateInVehicle(vehicle, frameW, read);
    return plate ? [plate] : [];
  });
  return nms(
    plates,
    plates.map(() => 1),
    0.3,
  ).map((i) => plates[i]);
};

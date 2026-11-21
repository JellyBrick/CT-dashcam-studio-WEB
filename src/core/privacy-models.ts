import mjs from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url';
import wasm from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';
import * as ort from 'onnxruntime-web/webgpu';

import faceModelUrl from '@/assets/models/face-yunet.onnx?url';
import vehicleModelUrl from '@/assets/models/vehicle-dfine-n.onnx?url';

import { nms, type Rect } from './box-tracker';

ort.env.wasm.wasmPaths = { mjs, wasm };
ort.env.wasm.numThreads = 1;
ort.env.logLevel = 'error';

const FACE_WIDTH = 640;
const FACE_SCORE = 0.45;
const FACE_PAD = 0.15;
const VEHICLE_SIZE = 512;
const VEHICLE_SCORE = 0.35;
const VEHICLE_CLASSES = new Set([2, 3, 5, 7]);

export interface DetectorInput {
  rgba: Uint8ClampedArray;
  w: number;
  h: number;
  srcW: number;
  srcH: number;
}

let queue: Promise<unknown> = Promise.resolve();
const serial = <T>(task: () => Promise<T>) => {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
};

class InputBuffers {
  private canvas: HTMLCanvasElement | null = null;
  private tensor = new Float32Array(0);
  private tensorSize = '';

  grab(source: CanvasImageSource, srcW: number, srcH: number, w: number, h: number) {
    this.canvas ??= document.createElement('canvas');
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, w, h);
    return { rgba: ctx.getImageData(0, 0, w, h).data, w, h, srcW, srcH };
  }

  tensorFor(w: number, h: number, length: number) {
    const size = `${w}x${h}`;
    if (this.tensorSize !== size) {
      this.tensor = new Float32Array(length);
      this.tensorSize = size;
    }
    return this.tensor;
  }
}

const createSession = (url: string) =>
  ort.InferenceSession.create(url, {
    executionProviders: ['webgpu', 'wasm'],
    graphOptimizationLevel: 'all',
  });

export const decodeYuNet = (
  outputs: Record<string, Float32Array>,
  padW: number,
  padH: number,
  scoreThreshold = FACE_SCORE,
): Rect[] => {
  const boxes: Rect[] = [];
  const scores: number[] = [];
  for (const stride of [8, 16, 32]) {
    const cols = Math.floor(padW / stride);
    const rows = Math.floor(padH / stride);
    const cls = outputs[`cls_${stride}`];
    const obj = outputs[`obj_${stride}`];
    const bbox = outputs[`bbox_${stride}`];
    for (let i = 0; i < rows * cols; i++) {
      const score = Math.sqrt(Math.min(1, Math.max(0, cls[i])) * Math.min(1, Math.max(0, obj[i])));
      if (score < scoreThreshold) continue;
      const cx = ((i % cols) + bbox[i * 4]) * stride;
      const cy = (Math.floor(i / cols) + bbox[i * 4 + 1]) * stride;
      const w = Math.exp(bbox[i * 4 + 2]) * stride;
      const h = Math.exp(bbox[i * 4 + 3]) * stride;
      boxes.push([cx - w / 2, cy - h / 2, w, h]);
      scores.push(score);
    }
  }
  return nms(boxes, scores, 0.3).map((i) => boxes[i]);
};

export class FaceDetector {
  private session: ort.InferenceSession;
  private buffers = new InputBuffers();

  private constructor(session: ort.InferenceSession) {
    this.session = session;
  }

  static async create() {
    return new FaceDetector(await createSession(faceModelUrl));
  }

  grab(source: CanvasImageSource, srcW: number, srcH: number): DetectorInput {
    const w = Math.min(FACE_WIDTH, srcW);
    return this.buffers.grab(source, srcW, srcH, w, Math.max(1, Math.round((srcH * w) / srcW)));
  }

  detect({ rgba, w, h, srcW, srcH }: DetectorInput): Promise<Rect[]> {
    return serial(async () => {
      const padW = Math.ceil(w / 32) * 32;
      const padH = Math.ceil(h / 32) * 32;
      const plane = padW * padH;
      const tensor = this.buffers.tensorFor(w, h, 3 * plane);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const src = (y * w + x) * 4;
          const dst = y * padW + x;
          tensor[dst] = rgba[src + 2];
          tensor[plane + dst] = rgba[src + 1];
          tensor[plane * 2 + dst] = rgba[src];
        }
      }
      const results = await this.session.run({
        [this.session.inputNames[0]]: new ort.Tensor('float32', tensor, [1, 3, padH, padW]),
      });
      const outputs = Object.fromEntries(
        this.session.outputNames.map((name) => [name, results[name].data as Float32Array]),
      );
      const sx = srcW / w;
      const sy = srcH / h;
      return decodeYuNet(outputs, padW, padH).map(([x, y, bw, bh]): Rect => {
        const px = bw * FACE_PAD;
        const py = bh * FACE_PAD;
        const rx = Math.max(0, (x - px) * sx);
        const ry = Math.max(0, (y - py) * sy);
        return [
          rx,
          ry,
          Math.min(srcW - rx, (bw + px * 2) * sx),
          Math.min(srcH - ry, (bh + py * 2) * sy),
        ];
      });
    });
  }
}

export class VehicleDetector {
  private session: ort.InferenceSession;
  private buffers = new InputBuffers();

  private constructor(session: ort.InferenceSession) {
    this.session = session;
  }

  static async create() {
    return new VehicleDetector(await createSession(vehicleModelUrl));
  }

  grab(source: CanvasImageSource, srcW: number, srcH: number): DetectorInput {
    return this.buffers.grab(source, srcW, srcH, VEHICLE_SIZE, VEHICLE_SIZE);
  }

  detect({ rgba, w, h, srcW, srcH }: DetectorInput): Promise<Rect[]> {
    return serial(async () => {
      const plane = w * h;
      const tensor = this.buffers.tensorFor(w, h, 3 * plane);
      for (let i = 0; i < plane; i++) {
        tensor[i] = rgba[i * 4] / 255;
        tensor[plane + i] = rgba[i * 4 + 1] / 255;
        tensor[plane * 2 + i] = rgba[i * 4 + 2] / 255;
      }
      const results = await this.session.run({
        [this.session.inputNames[0]]: new ort.Tensor('float32', tensor, [1, 3, h, w]),
      });
      const logits = results.logits.data as Float32Array;
      const boxes = results.pred_boxes.data as Float32Array;
      const classes = results.logits.dims[2];
      const found: Rect[] = [];
      const scores: number[] = [];
      for (let q = 0; q < results.logits.dims[1]; q++) {
        let score = -Infinity;
        for (const c of VEHICLE_CLASSES) score = Math.max(score, logits[q * classes + c]);
        score = 1 / (1 + Math.exp(-score));
        if (score < VEHICLE_SCORE) continue;
        const bw = boxes[q * 4 + 2] * srcW;
        const bh = boxes[q * 4 + 3] * srcH;
        if (bw < 25 || bh < 20 || bw >= srcW * 0.9) continue;
        found.push([boxes[q * 4] * srcW - bw / 2, boxes[q * 4 + 1] * srcH - bh / 2, bw, bh]);
        scores.push(score);
      }
      return nms(found, scores, 0.45).map((i) => found[i]);
    });
  }
}

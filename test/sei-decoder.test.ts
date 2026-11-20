import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { BinaryWriter, WireType } from '@bufbuild/protobuf/wire';
import { describe, it, expect } from 'vitest';

import {
  BlobFileHandle,
  RealTeslaSEIDecoder,
  type AsyncFileHandle,
  type TelemetryData,
} from '../src/core/sei-decoder';

class NodeFileHandle implements AsyncFileHandle {
  private fd: number;
  size: number;
  constructor(filePath: string) {
    this.fd = fs.openSync(filePath, 'r');
    this.size = fs.statSync(filePath).size;
  }
  read(offset: number, length: number): Promise<Uint8Array> {
    const buf = Buffer.alloc(length);
    const bytesRead = fs.readSync(this.fd, buf, 0, length, offset);
    return Promise.resolve(new Uint8Array(buf.buffer, buf.byteOffset, bytesRead));
  }
}

// Real-media integration checks are optional on hosts without these external fixtures.
const testMp4 =
  process.env.CT_TEST_MP4 ||
  'E:/tesla/project/testfile/SavedClips/2026-08-17_12-48-22/2026-08-17_12-37-37-front.mp4';
const pythonSource = process.env.CT_PYTHON_SOURCE || 'E:/tesla/project/CT-dashcam-studio';
describe.skipIf(!fs.existsSync(testMp4))(
  'RealTeslaSEIDecoder comparison with Python implementation',
  () => {
    it.skipIf(!fs.existsSync(path.join(pythonSource, 'core/decoder.py')))(
      'correctly parses telemetry matching Python core.decoder',
      async () => {
        // 1. Run Python decoder using temporary py script
        const pyScript = `
import sys, json
sys.path.insert(0, r"${pythonSource}")
from core.decoder import RealTeslaSEIDecoder

dec = RealTeslaSEIDecoder(r"${testMp4}")
frames = [0, 100, 500, 1000, 2000]
results = {
    "has_sei": dec.has_sei_data,
    "max_speed": dec.max_speed_kmh,
    "frames": {str(f): dec.get_frame_telemetry(f) for f in frames}
}
print(json.dumps(results))
`;
        const tempPy = path.join(__dirname, 'temp_verify.py');
        fs.writeFileSync(tempPy, pyScript, 'utf-8');
        let pyOutput = '';
        try {
          pyOutput = execSync(`python "${tempPy}"`, { encoding: 'utf-8' });
        } finally {
          if (fs.existsSync(tempPy)) fs.unlinkSync(tempPy);
        }
        const pyResult = JSON.parse(pyOutput.trim()) as {
          has_sei: boolean;
          max_speed: number;
          frames: Record<string, TelemetryData>;
        };

        // 2. Run TypeScript decoder
        const handle = new NodeFileHandle(testMp4);
        const tsDec = new RealTeslaSEIDecoder();
        await tsDec.parseMp4Sei(handle);

        expect(tsDec.hasSeiData).toBe(pyResult.has_sei);
        expect(tsDec.maxSpeedKmh).toBe(pyResult.max_speed);

        for (const f of [0, 100, 500, 1000, 2000]) {
          const pyFrame = pyResult.frames[String(f)];
          const tsFrame = tsDec.getFrameTelemetry(f);

          expect(tsFrame.speed_kmh).toBe(pyFrame.speed_kmh);
          expect(tsFrame.steering_deg).toBe(pyFrame.steering_deg);
          expect(tsFrame.accel_pct).toBe(pyFrame.accel_pct);
          expect(tsFrame.brake_applied).toBe(pyFrame.brake_applied);
          expect(tsFrame.ap_mode).toBe(pyFrame.ap_mode);
          expect(tsFrame.left_blinker).toBe(pyFrame.left_blinker);
          expect(tsFrame.right_blinker).toBe(pyFrame.right_blinker);
          expect(Math.abs(tsFrame.lat - pyFrame.lat)).toBeLessThan(1e-4);
          expect(Math.abs(tsFrame.lon - pyFrame.lon)).toBeLessThan(1e-4);
          expect(Math.abs(tsFrame.heading - pyFrame.heading)).toBeLessThan(1e-4);
        }
      },
    );

    it('MP4 packet path matches the sequential mdat scan through both sources', async () => {
      const seqDec = new RealTeslaSEIDecoder();
      await seqDec.parseMp4SeiSequential(new NodeFileHandle(testMp4));
      expect(seqDec.hasSeiData).toBe(true);

      const bytes = fs.readFileSync(testMp4);
      for (const handle of [new NodeFileHandle(testMp4), new BlobFileHandle(new Blob([bytes]))]) {
        const dec = new RealTeslaSEIDecoder();
        const progress: number[] = [];
        await dec.parseMp4Sei(handle, (pct) => progress.push(pct));

        expect(progress.at(-1)).toBe(100);
        expect(dec.sampleTimesSec?.length).toBeGreaterThan(0);
        expect(dec.hasSeiData).toBe(seqDec.hasSeiData);
        expect(dec.maxSpeedKmh).toBe(seqDec.maxSpeedKmh);
        expect(Array.from(dec.telemetryCache)).toEqual(Array.from(seqDec.telemetryCache));
      }
    });

    it('falls back to the sequential mdat scan when the moov box is missing', async () => {
      const bytes = new Uint8Array(fs.readFileSync(testMp4));
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      for (let p = 0; p + 8 <= bytes.length; p += view.getUint32(p) || bytes.length) {
        if (String.fromCharCode(...bytes.subarray(p + 4, p + 8)) === 'moov') {
          bytes.set(new TextEncoder().encode('free'), p + 4);
        }
      }
      const seqDec = new RealTeslaSEIDecoder();
      await seqDec.parseMp4SeiSequential(new NodeFileHandle(testMp4));

      const dec = new RealTeslaSEIDecoder();
      await dec.parseMp4Sei(new BlobFileHandle(new Blob([bytes])));

      expect(dec.sampleTimesSec).toBeNull();
      expect(dec.maxSpeedKmh).toBe(seqDec.maxSpeedKmh);
      expect(Array.from(dec.telemetryCache)).toEqual(Array.from(seqDec.telemetryCache));
    });
  },
);

it('decodes SEI protobuf fields and keeps the fields read before a truncated tail', () => {
  const payload = new BinaryWriter()
    .tag(4, WireType.Bit32)
    .float(27.5)
    .tag(5, WireType.Bit32)
    .float(42.4)
    .tag(6, WireType.Bit32)
    .float(-12.6)
    .tag(7, WireType.Varint)
    .bool(true)
    .tag(9, WireType.Varint)
    .bool(true)
    .tag(10, WireType.Varint)
    .int32(2)
    .tag(11, WireType.Bit64)
    .double(48.06)
    .tag(12, WireType.Bit64)
    .double(3.29)
    .tag(13, WireType.Bit64)
    .double(334.2)
    .tag(99, WireType.LengthDelimited)
    .bytes(new Uint8Array([1, 2, 3]))
    .finish();

  expect(RealTeslaSEIDecoder.parseProtobufWire(payload)).toEqual({
    speed_kmh: 99,
    steering_deg: -13,
    accel_pct: 42,
    brake_applied: true,
    brake_pct: 100,
    ap_mode: 'AUTOPILOT',
    left_blinker: true,
    right_blinker: false,
    lat: 48.06,
    lon: 3.29,
    heading: 334.2,
  });
  const truncated = RealTeslaSEIDecoder.parseProtobufWire(payload.subarray(0, 7));
  expect([truncated.speed_kmh, truncated.accel_pct]).toEqual([99, 0]);
});

import { BinaryReader, WireType } from '@bufbuild/protobuf/wire';
import { clamp } from 'es-toolkit';
import { BufferSource, CustomSource, EncodedPacketSink, Input, MP4 } from 'mediabunny';
// Ported from core/decoder.py (RealTeslaSEIDecoder)

export interface TelemetryData {
  speed_kmh: number;
  steering_deg: number;
  accel_pct: number;
  brake_applied: boolean;
  brake_pct: number;
  ap_mode: string;
  left_blinker: boolean;
  right_blinker: boolean;
  lat: number;
  lon: number;
  heading: number;
}

export const DEFAULT_TELEMETRY: TelemetryData = {
  speed_kmh: 0,
  steering_deg: 0,
  accel_pct: 0,
  brake_applied: false,
  brake_pct: 0,
  ap_mode: 'MANUAL',
  left_blinker: false,
  right_blinker: false,
  lat: 0.0,
  lon: 0.0,
  heading: 0.0,
};

export interface AsyncFileHandle {
  size: number;
  read(offset: number, length: number): Promise<Uint8Array>;
  readAll?(): Promise<Uint8Array>;
}

export class BlobFileHandle implements AsyncFileHandle {
  private cachedBuffer: Uint8Array | null = null;

  readonly blob: Blob;
  readonly size: number;

  constructor(blob: Blob) {
    this.blob = blob;
    this.size = blob.size;
  }
  async read(offset: number, length: number): Promise<Uint8Array> {
    if (this.cachedBuffer) {
      const end = Math.min(this.size, offset + length);
      if (offset >= end) return new Uint8Array(0);
      return this.cachedBuffer.subarray(offset, end);
    }
    const end = Math.min(this.size, offset + length);
    if (offset >= end) return new Uint8Array(0);
    const slice = this.blob.slice(offset, end);
    const buffer = await slice.arrayBuffer();
    return new Uint8Array(buffer);
  }

  async readAll(): Promise<Uint8Array> {
    if (!this.cachedBuffer) {
      const buffer = await this.blob.arrayBuffer();
      this.cachedBuffer = new Uint8Array(buffer);
    }
    return this.cachedBuffer;
  }
}

class BufferedChunkReader {
  private file: AsyncFileHandle;
  private diskPos: number;
  private limitPos: number;
  private buffer: Uint8Array = new Uint8Array(0);
  private cursor: number = 0;
  private readonly chunkSize: number = 1024 * 1024 * 2; // 2MB read chunks

  constructor(file: AsyncFileHandle, startPos: number, limitPos: number) {
    this.file = file;
    this.diskPos = startPos;
    this.limitPos = limitPos;
  }

  private async fill(minRequired: number): Promise<boolean> {
    const available = this.buffer.length - this.cursor;
    if (available >= minRequired) return true;

    // Compact buffer if needed
    let remaining: Uint8Array;
    if (this.cursor > 0 && available > 0) {
      remaining = this.buffer.subarray(this.cursor);
    } else if (available === 0) {
      remaining = new Uint8Array(0);
    } else {
      remaining = this.buffer;
    }
    this.cursor = 0;

    const toRead = Math.min(
      Math.max(this.chunkSize, minRequired - remaining.length),
      this.limitPos - this.diskPos,
    );

    if (toRead <= 0) {
      this.buffer = remaining;
      return remaining.length >= minRequired;
    }

    const chunk = await this.file.read(this.diskPos, toRead);
    this.diskPos += chunk.length;

    const newBuf = new Uint8Array(remaining.length + chunk.length);
    newBuf.set(remaining, 0);
    newBuf.set(chunk, remaining.length);
    this.buffer = newBuf;

    return this.buffer.length >= minRequired;
  }

  async readUint32(): Promise<number | null> {
    if (!(await this.fill(4))) return null;
    const view = new DataView(this.buffer.buffer, this.buffer.byteOffset + this.cursor, 4);
    const val = view.getUint32(0, false);
    this.cursor += 4;
    return val;
  }

  skip(count: number): Promise<boolean> {
    const available = this.buffer.length - this.cursor;
    if (count <= available) {
      this.cursor += count;
      return Promise.resolve(true);
    }

    const remainingToSkip = count - available;
    this.buffer = new Uint8Array(0);
    this.cursor = 0;

    if (this.diskPos + remainingToSkip > this.limitPos) {
      this.diskPos = this.limitPos;
      return Promise.resolve(false);
    }
    this.diskPos += remainingToSkip;
    return Promise.resolve(true);
  }

  async readExact(count: number): Promise<Uint8Array | null> {
    if (!(await this.fill(count))) return null;
    const slice = this.buffer.subarray(this.cursor, this.cursor + count);
    this.cursor += count;
    return slice;
  }
}

// Tesla writes the telemetry SEI NAL at the start of each sample, so only NALs that begin in
// the first 384 bytes are inspected and at most 256 bytes of the SEI NAL are decoded.
const findSeiNal = (sample: Uint8Array): Uint8Array | null => {
  const view = new DataView(sample.buffer, sample.byteOffset, sample.byteLength);
  const end = Math.min(sample.length, 384);
  for (let p = 0; p < end - 4;) {
    const nalLen = view.getUint32(p, false);
    p += 4;
    if ((sample[p] & 0x1f) === 6) return sample.subarray(p, p + Math.min(nalLen, 256));
    if (nalLen < 2 || p + nalLen > sample.length) return null;
    p += nalLen;
  }
  return null;
};

const AP_MODES = ['MANUAL', 'FSD ACTIVE', 'AUTOPILOT', 'TACC'];

export class RealTeslaSEIDecoder {
  sampleTimesSec: Float64Array | null = null;
  private presentationOrder: number[] = [];

  setSampleTimes(times: Float64Array | null): void {
    this.sampleTimesSec = times;
    this.presentationOrder = times
      ? Array.from(times.keys()).sort((a, b) => times[a] - times[b])
      : [];
  }

  getFrameIndexAtTime(timeSec: number, fallbackFps = 36): number {
    if (!Number.isFinite(timeSec)) return 0;
    const times = this.sampleTimesSec;
    const order = this.presentationOrder;
    if (!times || !order.length) return Math.max(0, Math.round(timeSec * fallbackFps));
    let low = 0,
      high = order.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (times[order[mid]] <= timeSec + 1e-7) low = mid + 1;
      else high = mid;
    }
    return order[Math.max(0, low - 1)];
  }

  telemetryCache: Map<number, TelemetryData> = new Map();
  sortedKeys: number[] = [];
  hasSeiData = false;
  maxSpeedKmh = 0;

  static stripEmulationPreventionBytes(data: Uint8Array): Uint8Array {
    const stripped = new Uint8Array(data.length);
    let length = 0;
    let zeroCount = 0;
    for (const byte of data) {
      if (zeroCount >= 2 && byte === 0x03) {
        zeroCount = 0;
        continue;
      }
      stripped[length++] = byte;
      zeroCount = byte === 0 ? zeroCount + 1 : 0;
    }
    return stripped.subarray(0, length);
  }

  static extractProtoPayload(nal: Uint8Array): Uint8Array | null {
    if (!nal || nal.length < 2) return null;
    for (let i = 3; i < nal.length - 1; i++) {
      const byte = nal[i];
      if (byte === 0x42) continue;
      if (byte === 0x69) {
        if (i > 2) {
          // slice from i+1 to end-1
          const sub = nal.subarray(i + 1, nal.length - 1);
          return RealTeslaSEIDecoder.stripEmulationPreventionBytes(sub);
        }
        break;
      }
      break;
    }
    return null;
  }

  static parseProtobufWire(payload: Uint8Array): TelemetryData {
    const reader = new BinaryReader(payload);
    let speed_mps = 0.0;
    let accel_pct = 0.0;
    let steering_deg = 0.0;
    let brake_applied = false;
    let autopilot_state = 0;
    let left_blinker = false;
    let right_blinker = false;
    let lat_deg = 0.0;
    let lon_deg = 0.0;
    let heading_deg = 0.0;

    while (reader.pos < reader.len) {
      try {
        const [fieldNumber, wireType] = reader.tag();
        if (wireType === WireType.Varint) {
          const val = reader.uint32();
          if (fieldNumber === 7) left_blinker = val !== 0;
          else if (fieldNumber === 8) right_blinker = val !== 0;
          else if (fieldNumber === 9) brake_applied = val !== 0;
          else if (fieldNumber === 10) autopilot_state = val;
        } else if (wireType === WireType.Bit32) {
          const valFloat = reader.float();
          if (fieldNumber === 4) speed_mps = valFloat;
          else if (fieldNumber === 5) accel_pct = valFloat;
          else if (fieldNumber === 6) steering_deg = valFloat;
        } else if (wireType === WireType.Bit64) {
          const valDouble = reader.double();
          if (fieldNumber === 11 && valDouble >= -90.0 && valDouble <= 90.0) {
            lat_deg = valDouble;
          } else if (fieldNumber === 12 && valDouble >= -180.0 && valDouble <= 180.0) {
            lon_deg = valDouble;
          } else if (fieldNumber === 13 && valDouble >= 0.0 && valDouble <= 360.0) {
            heading_deg = valDouble;
          }
        } else {
          reader.skip(wireType, fieldNumber);
        }
      } catch {
        break;
      }
    }

    if (isNaN(speed_mps)) {
      speed_mps = 0.0;
    }

    return {
      speed_kmh: Math.max(0, Math.round(speed_mps * 3.6)),
      steering_deg: Math.round(steering_deg),
      accel_pct: clamp(Math.round(accel_pct), 0, 100),
      brake_applied,
      brake_pct: brake_applied ? 100 : 0,
      ap_mode: AP_MODES[autopilot_state] ?? 'MANUAL',
      left_blinker,
      right_blinker,
      lat: lat_deg,
      lon: lon_deg,
      heading: heading_deg,
    };
  }

  private recordSei(frameIdx: number, nal: Uint8Array): void {
    const payload = RealTeslaSEIDecoder.extractProtoPayload(nal);
    if (!payload) return;
    const parsed = RealTeslaSEIDecoder.parseProtobufWire(payload);
    this.telemetryCache.set(frameIdx, parsed);
    this.hasSeiData = true;
    this.maxSpeedKmh = Math.max(this.maxSpeedKmh, parsed.speed_kmh);
  }

  static async findMdat(file: AsyncFileHandle): Promise<{ offset: number; size: number } | null> {
    let pos = 0;
    while (pos < file.size) {
      const readLen = Math.min(16, file.size - pos);
      if (readLen < 8) break;
      const chunk = await file.read(pos, readLen);
      if (chunk.length < 8) break;

      const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      const size32 = view.getUint32(0, false);
      const atomType = String.fromCharCode(chunk[4], chunk[5], chunk[6], chunk[7]);

      let headerSize = 8;
      let size = size32 - 8;

      if (size32 === 1) {
        if (chunk.length < 16) break;
        // 64-bit size
        const high = view.getUint32(8, false);
        const low = view.getUint32(12, false);
        const size64 = (BigInt(high) << 32n) | BigInt(low);
        size = Number(size64 - 16n);
        headerSize = 16;
      } else if (size32 === 0) {
        // extends to end of file
        size = file.size - (pos + 8);
      }

      if (atomType === 'mdat') {
        return { offset: pos + headerSize, size };
      }

      pos += headerSize + Math.max(0, size);
    }
    return null;
  }

  private async parseMp4SeiPackets(
    file: AsyncFileHandle,
    onProgress?: (pct: number, parsedFrames: number, totalFrames: number) => void,
  ): Promise<boolean> {
    // Files up to 150MB are read in one call to avoid per-read Android SAF Binder IPC latency.
    const source =
      file.readAll && file.size <= 150 * 1024 * 1024
        ? new BufferSource(await file.readAll())
        : new CustomSource({
            getSize: () => file.size,
            read: (start, end) => file.read(start, end - start),
            // 'network' reads ahead up to 8MB; a smaller cache evicts chunks before use and re-reads them.
            prefetchProfile: 'network',
            maxCacheSize: 16 * 1024 * 1024,
          });
    const input = new Input({ source, formats: [MP4] });
    try {
      const track = await input.getPrimaryVideoTrack();
      if (!track) return false;
      const sink = new EncodedPacketSink(track);
      const times: number[] = [];
      for await (const packet of sink.packets(undefined, undefined, { metadataOnly: true })) {
        times.push(packet.timestamp);
      }
      if (!times.length) return false;
      this.setSampleTimes(Float64Array.from(times));

      let frameIdx = 0;
      for await (const packet of sink.packets()) {
        const nal = findSeiNal(packet.data);
        if (nal) this.recordSei(frameIdx, nal);
        frameIdx++;
        if (onProgress && (frameIdx % 256 === 0 || frameIdx === times.length)) {
          onProgress(Math.round((frameIdx / times.length) * 100), frameIdx, times.length);
        }
      }

      this.sortedKeys = Array.from(this.telemetryCache.keys()).sort((a, b) => a - b);
      return true;
    } finally {
      input.dispose();
    }
  }

  async parseMp4SeiSequential(
    file: AsyncFileHandle,
    onProgress?: (pct: number, parsedFrames: number, totalFrames: number) => void,
  ): Promise<void> {
    const mdat = await RealTeslaSEIDecoder.findMdat(file);
    if (!mdat) return;

    const mdatEnd = mdat.size > 0 ? mdat.offset + mdat.size : file.size;
    const reader = new BufferedChunkReader(file, mdat.offset, mdatEnd);

    let frameNo = 0;
    const estTotalFrames = 2160;

    while (true) {
      const nalSize = await reader.readUint32();
      if (nalSize === null) break;

      if (nalSize < 2) {
        if (!(await reader.skip(nalSize))) break;
        continue;
      }

      const nal = await reader.readExact(nalSize);
      if (!nal) break;

      const nalType = nal[0] & 0x1f;
      if (nalType === 6) {
        // NAL_ID_SEI
        this.recordSei(frameNo, nal);
        frameNo++;
        if (onProgress && frameNo % 100 === 0) {
          const pct = Math.min(99, Math.round((frameNo / estTotalFrames) * 100));
          onProgress(pct, frameNo, estTotalFrames);
        }
      }
    }

    this.sortedKeys = Array.from(this.telemetryCache.keys()).sort((a, b) => a - b);
    if (onProgress) {
      onProgress(100, frameNo, frameNo);
    }
  }

  async parseMp4Sei(
    file: AsyncFileHandle,
    onProgress?: (pct: number, parsedFrames: number, totalFrames: number) => void,
  ): Promise<void> {
    const ok = await this.parseMp4SeiPackets(file, onProgress).catch((err: unknown) => {
      console.warn('[SEIDecoder] MP4 demux failed, falling back to sequential scan:', err);
      return false;
    });
    if (!ok) {
      await this.parseMp4SeiSequential(file, onProgress);
    }
  }

  getFrameTelemetry(frameIdx: number): TelemetryData {
    if (this.hasSeiData && this.telemetryCache.has(frameIdx)) {
      return this.telemetryCache.get(frameIdx)!;
    }

    if (this.hasSeiData && this.sortedKeys.length > 0) {
      const keys = this.sortedKeys;
      let low = 0;
      let high = keys.length - 1;

      while (low <= high) {
        const mid = (low + high) >>> 1;
        if (keys[mid] === frameIdx) return this.telemetryCache.get(keys[mid])!;
        if (keys[mid] < frameIdx) low = mid + 1;
        else high = mid - 1;
      }

      const pos = low;
      let closestIdx = keys[0];
      if (pos >= keys.length) {
        closestIdx = keys[keys.length - 1];
      } else if (pos === 0) {
        closestIdx = keys[0];
      } else {
        const before = keys[pos - 1];
        const after = keys[pos];
        closestIdx = frameIdx - before <= after - frameIdx ? before : after;
      }
      return this.telemetryCache.get(closestIdx) || DEFAULT_TELEMETRY;
    }

    return DEFAULT_TELEMETRY;
  }
}

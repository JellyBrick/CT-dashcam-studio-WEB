import { readFileSync } from 'node:fs';

import { expect, it } from 'vitest';

import { BlobFileHandle, DEFAULT_TELEMETRY, RealTeslaSEIDecoder } from '../src/core/sei-decoder';

const fixture = (fps: number) =>
  readFileSync(new URL(`./fixtures/timing-${fps}fps.mp4`, import.meta.url));

it.each([24, 30])(
  'reads real %sfps MP4 sample timestamps through both file sources',
  async (fps) => {
    const bytes = fixture(fps);
    const inMemory = new BlobFileHandle(new Blob([bytes]));
    const streamed = new BlobFileHandle(new Blob([bytes]));
    for (const handle of [inMemory, { size: streamed.size, read: streamed.read.bind(streamed) }]) {
      const decoder = new RealTeslaSEIDecoder();
      await decoder.parseMp4Sei(handle);
      expect(decoder.sampleTimesSec?.length).toBe(fps);
      expect(decoder.getFrameIndexAtTime(0.5)).toBe(fps / 2);
      expect(decoder.getFrameIndexAtTime(0)).toBe(0);
      decoder.telemetryCache.set(fps / 2, { ...DEFAULT_TELEMETRY, speed_kmh: fps });
      decoder.hasSeiData = true;
      expect(decoder.getFrameTelemetry(decoder.getFrameIndexAtTime(0.5)).speed_kmh).toBe(fps);
    }
  },
);

it('falls back without crashing when the MP4 cannot be demuxed', async () => {
  const decoder = new RealTeslaSEIDecoder();
  await decoder.parseMp4Sei(new BlobFileHandle(new Blob([new Uint8Array(9)])));
  expect(decoder.sampleTimesSec).toBeNull();
  expect(decoder.hasSeiData).toBe(false);
  expect(decoder.getFrameIndexAtTime(0.5)).toBe(18);
});

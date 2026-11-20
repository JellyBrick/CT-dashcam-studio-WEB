import { describe, expect, it } from 'vitest';

import { RealTeslaSEIDecoder, DEFAULT_TELEMETRY } from '../src/core/sei-decoder';

const evenTimes = (count: number, step: number) =>
  Float64Array.from({ length: count }, (_, i) => i * step);

describe('per-clip MP4 presentation time mapping', () => {
  it('uses each clip local time instead of fixed 36fps or accumulated output time', () => {
    const a = new RealTeslaSEIDecoder(),
      b = new RealTeslaSEIDecoder();
    a.setSampleTimes(evenTimes(30, 0.1));
    b.setSampleTimes(evenTimes(60, 0.05));
    expect(a.getFrameIndexAtTime(1)).toBe(10);
    expect(b.getFrameIndexAtTime(0)).toBe(0);
    expect(b.getFrameIndexAtTime(1)).toBe(20);
    a.telemetryCache.set(10, { ...DEFAULT_TELEMETRY, speed_kmh: 50 });
    b.telemetryCache.set(20, { ...DEFAULT_TELEMETRY, speed_kmh: 100 });
    a.hasSeiData = b.hasSeiData = true;
    expect(a.getFrameTelemetry(a.getFrameIndexAtTime(1)).speed_kmh).toBe(50);
    expect(b.getFrameTelemetry(b.getFrameIndexAtTime(1)).speed_kmh).toBe(100);
  });
  it('supports variable frame spacing and selects the displayed frame, not the next frame', () => {
    const d = new RealTeslaSEIDecoder();
    d.setSampleTimes(Float64Array.of(0, 0.1, 0.2, 0.7));
    expect(d.getFrameIndexAtTime(0.65)).toBe(2);
    expect(d.getFrameIndexAtTime(0.7)).toBe(3);
    expect(d.getFrameIndexAtTime(5)).toBe(3);
  });
  it('maps composition order back to original sample indices', () => {
    const d = new RealTeslaSEIDecoder();
    d.setSampleTimes(Float64Array.of(0, 0.2, 0.1));
    expect(d.getFrameIndexAtTime(0.1)).toBe(2);
    expect(d.getFrameIndexAtTime(0.2)).toBe(1);
  });
  it('preserves timing through worker structured-clone reconstruction', () => {
    const d = new RealTeslaSEIDecoder();
    d.setSampleTimes(structuredClone(evenTimes(4, 0.25)));
    expect(d.getFrameIndexAtTime(0.5)).toBe(2);
  });
  it('falls back to the nominal frame rate without sample times', () => {
    const d = new RealTeslaSEIDecoder();
    d.setSampleTimes(null);
    expect(d.getFrameIndexAtTime(0.5)).toBe(18);
  });
});

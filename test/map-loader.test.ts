import { afterEach, describe, expect, it, vi } from 'vitest';

import { OpenStreetMapTileLoader } from '../src/core/map-loader';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('map tiles', () => {
  it('waits before requesting a tile that failed again', async () => {
    let requests = 0;
    vi.stubGlobal(
      'Image',
      class {
        crossOrigin = '';
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_url: string) {
          requests++;
          queueMicrotask(() => this.onerror?.());
        }
      },
    );
    const now = performance.now();
    const clock = vi.spyOn(performance, 'now').mockReturnValue(now);
    expect(await OpenStreetMapTileLoader.getTile(16, 1, 2)).toBeNull();
    expect(await OpenStreetMapTileLoader.getTile(16, 1, 2)).toBeNull();
    expect(requests).toBe(1);
    clock.mockReturnValue(now + 31_000);
    expect(await OpenStreetMapTileLoader.getTile(16, 1, 2)).toBeNull();
    expect(requests).toBe(2);
  });
});

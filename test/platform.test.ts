import { describe, it, expect } from 'vitest';

import { isAppWindow } from '../src/lib/platform';

describe('installed app windows', () => {
  it.each(['standalone', 'minimal-ui', 'window-controls-overlay'])(
    'detects %s on desktop/Android',
    (mode) => {
      expect(
        isAppWindow((query) => ({ matches: query === `(display-mode: ${mode})` }), false),
      ).toBe(true);
    },
  );
  it('detects the iPhone home-screen flag without Chromium media flags', () => {
    expect(isAppWindow(() => ({ matches: false }), true)).toBe(true);
  });
  it('does not treat a normal browser, even in fullscreen, as an installed app', () => {
    expect(
      isAppWindow((query) => ({ matches: query === '(display-mode: fullscreen)' }), false),
    ).toBe(false);
  });
});

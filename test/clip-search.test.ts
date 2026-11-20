import { describe, expect, it } from 'vitest';

import { filterClipGroups } from '../src/studio/clip-search';

import type { ClipItem, FolderGroup } from '../src/core/clip-scanner';

const clip = (folder: string, timestampRaw: string): ClipItem => ({
  id: `${folder}/${timestampRaw}`,
  safeId: timestampRaw,
  folder,
  timestampStr: timestampRaw.replace('_', ' ').replace(/-(\d\d)-(\d\d)$/, ':$1:$2'),
  timestampRaw,
  cams: {},
  durationSec: 60,
  totalFrames: 2160,
});

const groups: FolderGroup[] = [
  {
    folderName: 'SentryClips/2025-12-20_08-00-00',
    clips: [clip('SentryClips/2025-12-20_08-00-00', '2025-12-20_07-59-00')],
  },
  {
    folderName: 'SavedClips/2025-12-21_21-00-00',
    clips: [
      clip('SavedClips/2025-12-21_21-00-00', '2025-12-21_20-58-54'),
      clip('SavedClips/2025-12-21_21-00-00', '2025-12-21_20-59-54'),
    ],
  },
];

describe('clip search', () => {
  it('returns every group for an empty or punctuation-only query', () => {
    expect(filterClipGroups(groups, '')).toBe(groups);
    expect(filterClipGroups(groups, ' -:/ ')).toBe(groups);
  });

  it('matches dates and times regardless of separators', () => {
    const result = filterClipGroups(groups, '12/21 20:59');
    expect(result).toHaveLength(1);
    expect(result[0]?.clips.map((item) => item.timestampRaw)).toEqual(['2025-12-21_20-59-54']);
  });

  it('keeps a whole group when its folder matches', () => {
    expect(filterClipGroups(groups, 'sentry')).toEqual([groups[0]]);
  });

  it('drops groups without matches', () => {
    expect(filterClipGroups(groups, '2024')).toEqual([]);
  });
});

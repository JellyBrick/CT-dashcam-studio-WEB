import { clamp } from 'es-toolkit';

import type { TranslationKey } from '@/i18n';

export type TutorialPlatform = 'pc' | 'android' | 'ios';

export const TUTORIAL_STEPS = ['load', 'range', 'export'] as const;

export const detectTutorialPlatform = (device: {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
}): TutorialPlatform => {
  if (
    /iPhone|iPad|iPod/i.test(device.userAgent || '') ||
    (device.platform === 'MacIntel' && (device.maxTouchPoints || 0) > 1)
  )
    return 'ios';
  return /Android/i.test(device.userAgent || '') ? 'android' : 'pc';
};

export const tutorialLoadAction = (platform: TutorialPlatform) => {
  return platform === 'pc' ? 'btn_open_folder' : 'btn_open_folder_mobile';
};

export const tutorialStep = (platform: TutorialPlatform, index: number) => {
  const step = Number.isFinite(index) ? clamp(Math.trunc(index), 0, 2) : 0;
  const heading = TUTORIAL_STEPS[step] ?? 'load';
  const body: TranslationKey =
    step === 0
      ? `tutorial_${platform}_load`
      : step === 2
        ? `tutorial_${platform}_export`
        : platform === 'pc'
          ? 'tutorial_pc_range'
          : 'tutorial_mobile_range';
  return {
    heading: `tutorial_${heading}` as const,
    body,
    warning: platform === 'ios' && step === 0,
  };
};

import { CAMERA_KEYS, type CameraKey } from '@/core/constants';

import { setLayoutMode, showSingleCamera } from './playback';

import type { LayoutName } from './store';
import type { TranslationKey } from '@/i18n';

export const LAYOUTS: { value: LayoutName; key: TranslationKey }[] = [
  { value: 'front-focus', key: 'layout_13' },
  { value: 'quad', key: 'layout_2x2' },
  { value: 'single', key: 'layout_single' },
];

export const isPillar = (camera: CameraKey) =>
  camera === 'left_pillar' || camera === 'right_pillar';

export const chooseLayout = (value: unknown) => {
  const layout = LAYOUTS.find((item) => item.value === value)?.value;
  if (layout) setLayoutMode(layout);
};

export const chooseCamera = (value: unknown) => {
  const camera = CAMERA_KEYS.find((key) => key === value);
  if (camera) showSingleCamera(camera);
};

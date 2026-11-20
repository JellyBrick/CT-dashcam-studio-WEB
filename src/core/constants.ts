export interface ResolutionConfig {
  size: [number, number];
  bitrate_mbps: number;
}

export const RESOLUTIONS = {
  qhd: { size: [2560, 1440], bitrate_mbps: 18.0 },
  fhd: { size: [1920, 1080], bitrate_mbps: 10.0 },
  hd: { size: [1280, 720], bitrate_mbps: 5.0 },
  compact: { size: [960, 540], bitrate_mbps: 2.8 },
} satisfies Record<string, ResolutionConfig>;

export type ResolutionName = keyof typeof RESOLUTIONS;

export const DEFAULT_RESOLUTION: ResolutionName = 'fhd';

export type CameraKey =
  | 'front'
  | 'back'
  | 'left_repeater'
  | 'right_repeater'
  | 'left_pillar'
  | 'right_pillar';

export const CAMERA_KEYS: CameraKey[] = [
  'front',
  'back',
  'left_repeater',
  'right_repeater',
  'left_pillar',
  'right_pillar',
];

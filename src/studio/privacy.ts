import { toast } from 'sonner';

import { i18n } from '@/i18n';

import { renderFrame, setPreviewPrivacy } from './playback';
import { getStudio, setStudio } from './store';

import type { PrivacyFlags, PrivacyProcessor } from '@/core/privacy-filter';
import type { RenderOptions } from '@/core/renderer';

export type PrivacyOption = 'face_blur' | 'plate_blur' | 'plate_enhance';

let processor: PrivacyProcessor | null = null;

const flagsOf = (options: RenderOptions): PrivacyFlags => ({
  face: options.face_blur,
  plate: options.plate_blur ? 'blur' : options.plate_enhance ? 'enhance' : null,
});

const covers = (current: PrivacyProcessor | null, flags: PrivacyFlags) =>
  !!current &&
  (!flags.face || current.hasFaceDetector) &&
  (!flags.plate || current.hasVehicleDetector);

export const ensurePrivacy = async (): Promise<PrivacyProcessor | null> => {
  const flags = flagsOf(getStudio().options);
  if (!flags.face && !flags.plate) {
    if (processor) processor.flags = flags;
    return null;
  }
  if (!covers(processor, flags)) {
    setStudio({ privacyLoading: true });
    const loading = toast.loading(i18n.t('toast_privacy_loading'));
    try {
      const { PrivacyProcessor } = await import('@/core/privacy-filter');
      processor = await PrivacyProcessor.load(flags, processor);
      processor.onPreviewUpdate = () => {
        if (!getStudio().isPlaying) renderFrame();
      };
    } finally {
      toast.dismiss(loading);
      setStudio({ privacyLoading: false });
    }
  }
  processor!.flags = flagsOf(getStudio().options);
  return processor;
};

export const setPrivacyOption = async (key: PrivacyOption, value: boolean) => {
  const before = getStudio().options;
  setStudio({
    options: {
      ...before,
      [key]: value,
      ...(value && key === 'plate_blur' ? { plate_enhance: false } : {}),
      ...(value && key === 'plate_enhance' ? { plate_blur: false } : {}),
    },
  });
  try {
    setPreviewPrivacy(await ensurePrivacy());
  } catch (error) {
    console.error('[Privacy] failed to load models:', error);
    const { face_blur, plate_blur, plate_enhance } = before;
    setStudio((state) => ({ options: { ...state.options, face_blur, plate_blur, plate_enhance } }));
    toast.error(i18n.t('alert_privacy_failed', { 0: String(error) }));
  }
  renderFrame();
};

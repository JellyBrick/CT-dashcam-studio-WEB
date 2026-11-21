import { sumBy, uniqBy } from 'es-toolkit';
import { toast } from 'sonner';

import { getClipFile } from '@/core/clip-scanner';
import { RESOLUTIONS, type ResolutionName } from '@/core/constants';
import { i18n } from '@/i18n';
import { isAndroid, isIOSOrAndroid, isMobileDevice } from '@/lib/platform';

import {
  getClipDecoder,
  pauseAllVideos,
  releasePreviewDecoders,
  seekTo,
  selectClip,
  SOURCE_FPS,
} from './playback';
import { ensurePrivacy } from './privacy';
import { buildTargetClipChain } from './range';
import { getStudio, setStudio, type StudioState } from './store';

import type { WebCodecsExporter } from '@/core/exporter';
import type { TFunction } from 'i18next';

let exporter: WebCodecsExporter | null = null;

const loadExporter = async () => {
  const { WebCodecsExporter } = await import('@/core/exporter');
  return (exporter ??= new WebCodecsExporter());
};

export const EXPORT_SPEEDS = [0.5, 1, 1.5, 2, 4, 5] as const;

export const fpsOptions = (speed: number, mobile: boolean, t: TFunction) => {
  const base = SOURCE_FPS;
  const maxFps = Math.min(120, Math.round(base * speed));
  const candidates = mobile
    ? [
        { value: 30, label: t('fps_30_rec') },
        { value: base, label: t('fps_orig_default', { 0: base }) },
        { value: 60, label: t('fps_60') },
        { value: 24, label: t('fps_24') },
        { value: 15, label: t('fps_15') },
      ]
    : [
        {
          value: maxFps,
          label: t(speed > 1 ? 'fps_orig_speed' : 'fps_orig_optimal', { 0: maxFps }),
        },
        { value: 60, label: t('fps_60') },
        { value: base, label: t('fps_orig_default', { 0: base }) },
        { value: 30, label: t('fps_30') },
        { value: 24, label: t('fps_24') },
        { value: 15, label: t('fps_saving') },
      ];
  return uniqBy(
    candidates.filter((option) => option.value <= maxFps),
    (option) => option.value,
  );
};

export const defaultFps = (speed: number, mobile: boolean) => {
  if (!mobile) return Math.min(120, Math.round(SOURCE_FPS * speed));
  return speed === 1 ? SOURCE_FPS : 30;
};

export const setExportSpeed = (speed: number) => {
  setStudio((state) => ({
    options: { ...state.options, exportSpeed: speed },
    exportFps: defaultFps(speed, isMobileDevice()),
  }));
};

export const estimateSizeMb = (state: StudioState) => {
  const { resolution, exportFps, startPoint, endPoint, options } = state;
  const fpsRatio = Math.pow(exportFps / 30, 0.45);
  const durationSec =
    startPoint && endPoint
      ? Math.max(0.1, (endPoint.absTimeMs - startPoint.absTimeMs) / 1000)
      : sumBy(buildTargetClipChain(state), (seg) => seg.endSec - seg.startSec);
  const bytesPerSec = (RESOLUTIONS[resolution].bitrate_mbps * 1_000_000) / 8;
  return (bytesPerSec * durationSec * fpsRatio) / ((options.exportSpeed ?? 1) * 1024 * 1024);
};

export const canEncodeResolution = async (resolution: ResolutionName, frameRate: number) => {
  if (!window.isSecureContext || typeof VideoEncoder === 'undefined') return false;
  const { canEncodeVideo } = await import('mediabunny');
  const [width, height] = RESOLUTIONS[resolution].size;
  return canEncodeVideo('avc', { width, height, frameRate });
};

export const cancelExport = () => {
  if (!getStudio().exportProgress) return;
  exporter?.cancel();
  setStudio((state) => ({
    exportProgress: state.exportProgress && { ...state.exportProgress, cancelling: true },
  }));
};

const download = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = Object.assign(document.createElement('a'), { href: url, download: fileName });
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 60_000);
};

type SavePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<FileSystemFileHandle>;
};

const pickSaveFile = (suggestedName: string) => {
  const picker = (window as SavePickerWindow).showSaveFilePicker;
  if (!picker || isIOSOrAndroid()) return null;
  return picker
    .call(window, {
      suggestedName,
      types: [{ description: 'MP4', accept: { 'video/mp4': ['.mp4'] } }],
    })
    .catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      console.warn('[Export] Save picker unavailable, downloading instead:', error);
      return null;
    });
};

const save = async (blob: Blob, fileName: string, handle: FileSystemFileHandle | null) => {
  if (!handle) {
    download(blob, fileName);
    return;
  }
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
  toast.success(i18n.t('export_saved_to', { 0: handle.name }));
};

const requestWakeLock = async () => {
  try {
    return await navigator.wakeLock?.request('screen');
  } catch (error) {
    console.warn('[Export] Screen wake lock not granted:', error);
    return undefined;
  }
};

export const startExport = async ({ confirmed = false } = {}) => {
  const state = getStudio();
  const { activeClip, currentTimeSec, resolution, exportFps, options } = state;
  if (!activeClip || state.exportProgress) return;
  if (typeof VideoEncoder === 'undefined') {
    toast.error(i18n.t('alert_http_security'));
    return;
  }
  const segments = buildTargetClipChain(state);
  const first = segments[0];
  const last = segments.at(-1);
  if (!first || !last) {
    toast.error(i18n.t('alert_no_range'));
    return;
  }
  const totalSec = sumBy(segments, (seg) => seg.endSec - seg.startSec);
  const mobile = getStudio().layoutMode !== 'desktop' || isMobileDevice() || isIOSOrAndroid();
  if (mobile && totalSec > 180 && !confirmed) {
    setStudio({ confirmLongExport: true });
    return;
  }

  const fileName =
    segments.length > 1
      ? `TeslaCam_${first.clip.timestampRaw}_to_${last.clip.timestampRaw}_export.mp4`
      : `TeslaCam_${first.clip.timestampRaw}_export.mp4`;
  let handle: FileSystemFileHandle | null;
  try {
    handle = await pickSaveFile(fileName);
  } catch {
    return;
  }

  const speed = options.exportSpeed ?? 1;
  pauseAllVideos(true);
  releasePreviewDecoders();
  setStudio({
    exportProgress: {
      pct: 0,
      segment: 1,
      totalSegments: segments.length,
      targetFps: exportFps,
      speed,
      cancelling: false,
    },
    exportStatus: { key: 'status_preparing', params: { 0: segments.length } },
  });

  const preventUnload = (event: BeforeUnloadEvent) => event.preventDefault();
  window.addEventListener('beforeunload', preventUnload);
  const wakeLock = await requestWakeLock();

  try {
    const privacy = await ensurePrivacy();
    const blob = await (
      await loadExporter()
    ).exportMultiClip({
      segments,
      getClipDecoder: async (clip) => getClipDecoder(clip, await getClipFile(clip, 'front')),
      sourceFps: SOURCE_FPS,
      targetFps: exportFps,
      exportSpeed: speed,
      resolutionName: resolution,
      options: getStudio().options,
      privacy,
      onAnalysisProgress: (pct, segment, totalSegments) =>
        setStudio({
          exportStatus: {
            key: 'status_face_analysis',
            params: { 0: pct, 1: segment, 2: totalSegments },
          },
        }),
      onProgress: (pct, segment, totalSegments) =>
        setStudio((current) => ({
          exportProgress: current.exportProgress && {
            ...current.exportProgress,
            pct,
            segment,
            totalSegments,
          },
          exportStatus: {
            key: 'status_encoding',
            params: { 0: pct, 1: segment, 2: totalSegments },
          },
        })),
    });
    await save(blob, fileName, handle);
    setStudio({ exportStatus: { key: 'status_success' } });
    if (isAndroid()) toast.success(i18n.t('export_success_alert'), { duration: 10_000 });
  } catch (error) {
    console.error('[Export Error]', error);
    const message = error instanceof Error ? error.message : String(error);
    setStudio({ exportStatus: { key: 'status_error', detail: message } });
    toast.error(`${i18n.t('status_error')}${message}`, {
      description: error instanceof Error ? error.stack?.slice(0, 300) : undefined,
      duration: 15_000,
    });
  } finally {
    setStudio({ exportProgress: null });
    window.removeEventListener('beforeunload', preventUnload);
    wakeLock?.release().catch(() => {});
    if (getStudio().activeClip?.id === activeClip.id) {
      await selectClip(activeClip);
      if (currentTimeSec > 0) seekTo(currentTimeSec);
    }
    setTimeout(() => {
      if (getStudio().exportStatus?.key === 'status_success') setStudio({ exportStatus: null });
    }, 4000);
  }
};

import { clamp } from 'es-toolkit';
import { toast } from 'sonner';

import {
  formatFolderGroup,
  groupFilesIntoClips,
  scanFileSystemDirectory,
  type ScannedFileItem,
  yieldToCompositor,
} from '@/core/clip-scanner';
import { i18n } from '@/i18n';
import { isIOS, isMobileDevice } from '@/lib/platform';

import { resetSession, selectClip } from './playback';
import { getStudio, setStudio, type TranslationParams } from './store';

import type { TranslationKey } from '@/i18n';

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
};

let encryptedNotified = false;
let watchdog: ReturnType<typeof setTimeout> | undefined;
let waitingTimer: ReturnType<typeof setTimeout> | undefined;

const showLoadProgress = (
  titleKey: TranslationKey,
  countKey: TranslationKey,
  pct: number,
  indeterminate = false,
  params: TranslationParams = {},
) => {
  setStudio({
    loadProgress: {
      titleKey,
      countKey,
      params,
      indeterminate,
      pct: clamp(pct, 0, 100),
    },
  });
};

const hideLoadProgress = () => {
  clearTimeout(watchdog);
  setStudio({ loadProgress: null });
};

const startWatchdog = () => {
  clearTimeout(watchdog);
  watchdog = setTimeout(() => {
    hideLoadProgress();
    toast(i18n.t('toast_load_timeout'));
  }, 120_000);
};

const notifyEncryptedClips = () => {
  if (encryptedNotified) return;
  encryptedNotified = true;
  toast(i18n.t('toast_encrypted_clips'), { duration: 8000 });
};

export const canUseDirectoryPicker = () => {
  return (
    !isIOS() &&
    'showDirectoryPicker' in window &&
    (window.isSecureContext || ['localhost', '127.0.0.1'].includes(window.location.hostname))
  );
};

export const loadFiles = async (files: ArrayLike<File | ScannedFileItem>) => {
  if (files.length === 0) return;
  resetSession();
  encryptedNotified = false;
  if (getStudio().layoutMode !== 'desktop') setStudio({ panelTab: 'clips' });

  const total = files.length;
  showLoadProgress('progress_grouping_clips', 'progress_grouping_status', 0, false, {
    0: 0,
    1: total,
    2: 0,
    3: 0,
  });
  await yieldToCompositor();
  const folderGroups = await groupFilesIntoClips(
    files,
    (done, count, clipCount) => {
      const pct = Math.round((done / count) * 100);
      showLoadProgress('progress_grouping_clips', 'progress_grouping_status', pct, false, {
        0: done,
        1: count,
        2: pct,
        3: clipCount,
      });
    },
    notifyEncryptedClips,
  );
  setStudio({ folderGroups });
  await yieldToCompositor();
  hideLoadProgress();

  const first = folderGroups[0];
  const firstClip = first?.clips[0];
  if (!first || !firstClip) {
    toast(i18n.t('empty_no_clips'));
    return;
  }
  if (getStudio().layoutMode === 'portrait') setStudio({ explorerExpanded: true });
  const isRecent = formatFolderGroup(first.folderName, first.clips).type === 'recent';
  if (!isMobileDevice() || folderGroups.length === 1 || isRecent) {
    requestAnimationFrame(() => {
      selectClip(firstClip).catch(reportError);
    });
  }
};

export const awaitPickedFiles = () => {
  clearTimeout(waitingTimer);
  waitingTimer = setTimeout(() => {
    showLoadProgress('progress_waiting_files', 'progress_waiting_files_detail', 0, true);
  }, 0);
};

export const cancelPickedFiles = () => {
  clearTimeout(waitingTimer);
  hideLoadProgress();
};

export const loadPickedFiles = async (files: File[]) => {
  clearTimeout(waitingTimer);
  if (files.length === 0) {
    hideLoadProgress();
    return;
  }
  startWatchdog();
  showLoadProgress('progress_grouping_clips', 'progress_files_received', 0, true, {
    0: files.length,
  });
  await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
  try {
    await loadFiles(files);
  } catch (error) {
    console.error('[App] Failed to load files:', error);
    hideLoadProgress();
  }
};

export const openDirectoryPicker = async (): Promise<boolean> => {
  try {
    const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
    if (!picker) return false;
    const directory = await picker.call(window);
    encryptedNotified = false;
    if (/EncryptedClips/i.test(directory.name)) notifyEncryptedClips();
    startWatchdog();
    showLoadProgress('progress_searching_clips', 'progress_searching_videos', 0, true);
    const items = await scanFileSystemDirectory(
      directory,
      (filesCount, dirsCount) =>
        showLoadProgress('progress_searching_clips', 'progress_found_videos', 0, true, {
          0: filesCount,
          1: dirsCount,
        }),
      notifyEncryptedClips,
    );
    if (items.length > 0) await loadFiles(items);
    else {
      hideLoadProgress();
      toast(i18n.t('empty_no_clips'));
    }
    return true;
  } catch (error) {
    hideLoadProgress();
    if (error instanceof DOMException && error.name === 'AbortError') return true;
    console.warn('showDirectoryPicker failed, falling back to input:', error);
    toast(
      i18n.t('alert_open_folder_failed', {
        0: error instanceof Error ? error.message : String(error),
      }),
    );
    return false;
  }
};

const readEntry = async (entry: FileSystemEntry, path: string, files: File[]): Promise<void> => {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject),
    );
    Object.defineProperty(file, 'webkitRelativePath', {
      value: path ? `${path}/${file.name}` : file.name,
    });
    files.push(file);
    return;
  }
  if (!entry.isDirectory) return;
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const childPath = path ? `${path}/${entry.name}` : entry.name;
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    if (batch.length === 0) return;
    for (const child of batch) await readEntry(child, childPath, files);
  }
};

export const loadDroppedItems = async (items: DataTransferItemList) => {
  const dropped = Array.from(items, (item) => item.webkitGetAsEntry() ?? item.getAsFile());
  const files: File[] = [];
  for (const item of dropped) {
    if (item instanceof File) files.push(item);
    else if (item) await readEntry(item, '', files);
  }
  await loadFiles(files);
};

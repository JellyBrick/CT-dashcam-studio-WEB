import { type HotkeyCallback, type Options, useHotkeys } from 'react-hotkeys-hook';

import { nextClip, prevClip, seekRelative, seekTo, togglePlay } from '@/studio/playback';
import { setInPoint, setOutPoint } from '@/studio/range';
import { getStudio, isExporting, openDialog } from '@/studio/store';

const IGNORED_TARGETS =
  '[role="checkbox"], [role="combobox"], [role="listbox"], [role="dialog"], [role="alertdialog"]';

const openHotkeys = () => openDialog('hotkeys');

const actions: Record<string, (event: KeyboardEvent) => void> = {
  space: togglePlay,
  left: (event) => seekRelative(event.shiftKey ? -5 : -1),
  right: (event) => seekRelative(event.shiftKey ? 5 : 1),
  home: () => seekTo(0),
  bracketleft: () => {
    prevClip().catch(reportError);
  },
  bracketright: () => {
    nextClip().catch(reportError);
  },
  i: setInPoint,
  o: setOutPoint,
  f1: openHotkeys,
  slash: openHotkeys,
};

const keys = Object.keys(actions);

const runAction: HotkeyCallback = (event, { hotkey }) => actions[hotkey]?.(event);

const options: Options = {
  enableOnFormTags: ['slider'],
  ignoreModifiers: true,
  preventDefault: true,
  ignoreEventWhen: (event) =>
    (event.code === 'Slash' && event.key !== '?') ||
    (event.target instanceof Element && !!event.target.closest(IGNORED_TARGETS)) ||
    isExporting() ||
    !!getStudio().loadProgress,
};

export const useShortcuts = () => {
  useHotkeys(keys, runAction, options);
};

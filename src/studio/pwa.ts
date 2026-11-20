import { create } from 'zustand';

import { isAppWindow } from '@/lib/platform';

import { openDialog } from './store';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export const usePwa = create<{ prompt: InstallPromptEvent | null; installed: boolean }>(() => ({
  prompt: null,
  installed: isAppWindow(),
}));

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  usePwa.setState({ prompt: event as InstallPromptEvent });
});

window.addEventListener('appinstalled', () => usePwa.setState({ prompt: null, installed: true }));

export const promptInstall = async (): Promise<boolean | null> => {
  const { prompt } = usePwa.getState();
  if (!prompt) return null;
  usePwa.setState({ prompt: null });
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  if (outcome === 'accepted') usePwa.setState({ installed: true });
  return outcome === 'accepted';
};

export const installApp = () => {
  promptInstall()
    .then((accepted) => {
      if (accepted === null) openDialog('install');
    })
    .catch((error: unknown) => {
      console.warn('[PWA] Prompt error:', error);
      openDialog('install');
    });
};

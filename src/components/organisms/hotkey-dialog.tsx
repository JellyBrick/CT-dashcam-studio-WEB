import { For } from '@jellybrick/react-solid-flow';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

import { Kbd } from '@/components/atoms/kbd';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/molecules/dialog';
import { openDialog, useStudio } from '@/studio/store';

import type { TranslationKey } from '@/i18n';

const HOTKEYS: { keys: string[][]; description: TranslationKey }[] = [
  { keys: [['Space']], description: 'hk_space' },
  { keys: [['←'], ['→']], description: 'hk_seek_1' },
  {
    keys: [
      ['Shift', '←'],
      ['Shift', '→'],
    ],
    description: 'hk_seek_5',
  },
  { keys: [['Home']], description: 'hk_home' },
  { keys: [['['], [']']], description: 'hk_clip_step' },
  { keys: [['I'], ['O']], description: 'hk_in_out' },
  { keys: [['F1'], ['?']], description: 'hk_guide_pop' },
];

const GESTURES: { key: TranslationKey; description: TranslationKey }[] = [
  { key: 'hk_key_double_click', description: 'hk_fullscreen' },
  { key: 'hk_key_bar_drag', description: 'hk_telemetry_drag' },
  { key: 'hk_key_bar_double_click', description: 'hk_telemetry_reset' },
  { key: 'hk_key_slider_double_click', description: 'hk_slider_reset' },
];

export const HotkeyDialog = () => {
  const { t } = useTranslation();
  const open = useStudio((state) => state.dialog === 'hotkeys');
  return (
    <Dialog open={open} onOpenChange={(next) => !next && openDialog(null)}>
      <DialogContent closeLabel={t('btn_close')} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('hotkey_modal_title')}</DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3 text-subtitle">
          <For each={HOTKEYS}>
            {({ keys, description }) => (
              <Fragment key={description}>
                <dt className="flex items-center gap-1">
                  {keys.map((combo, index) => (
                    <Fragment key={combo.join('+')}>
                      {index > 0 && <span className="px-0.5 text-faint-foreground">/</span>}
                      {combo.map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </Fragment>
                  ))}
                </dt>
                <dd className="text-muted-foreground">{t(description)}</dd>
              </Fragment>
            )}
          </For>
        </dl>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-subtitle">
          <For each={GESTURES}>
            {({ key, description }) => (
              <Fragment key={key}>
                <dt>{t(key)}</dt>
                <dd className="text-muted-foreground">{t(description)}</dd>
              </Fragment>
            )}
          </For>
        </dl>
      </DialogContent>
    </Dialog>
  );
};

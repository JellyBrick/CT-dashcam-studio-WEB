import { For, Show } from '@jellybrick/react-solid-flow';
import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/atoms/button';
import { Swap } from '@/components/atoms/swap';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/molecules/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/molecules/toggle-group';
import {
  detectTutorialPlatform,
  TUTORIAL_STEPS,
  type TutorialPlatform,
  tutorialStep,
} from '@/lib/tutorial';
import { cn } from '@/lib/utils';
import { openDialog, useStudio } from '@/studio/store';

const TutorialDemo = lazy(() =>
  import('./tutorial-demo').then((module) => ({ default: module.TutorialDemo })),
);

const PLATFORMS: { value: TutorialPlatform; label: string }[] = [
  { value: 'pc', label: 'PC / Web' },
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iPhone' },
];

const TutorialBody = () => {
  const { t } = useTranslation();
  const [platform, setPlatform] = useState(() => detectTutorialPlatform(navigator));
  const [step, setStep] = useState(0);
  const [replay, setReplay] = useState(0);
  const state = tutorialStep(platform, step);
  const close = () => openDialog(null);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('tutorial_title')}</DialogTitle>
      </DialogHeader>
      <div className="flex min-h-0 flex-col gap-6 overflow-y-auto">
        <ToggleGroup
          aria-label={t('tutorial_device')}
          value={[platform]}
          onValueChange={(values) => {
            const next = PLATFORMS.find((item) => item.value === values[0]);
            if (!next) return;
            setPlatform(next.value);
            setStep(0);
          }}
          className="w-full"
        >
          <For each={PLATFORMS}>
            {({ value, label }) => (
              <ToggleGroupItem key={value} value={value}>
                {label}
              </ToggleGroupItem>
            )}
          </For>
        </ToggleGroup>
        <div className="grid items-center gap-8 sm:grid-cols-[1.1fr_1fr]">
          <Suspense fallback={<div className="aspect-[16/10] w-full" />}>
            <Swap id={`${platform}-${step}-${replay}`}>
              <TutorialDemo platform={platform} step={step} />
            </Swap>
          </Suspense>
          <div className="flex flex-col gap-5">
            <ol className="flex flex-col gap-1">
              <For each={TUTORIAL_STEPS}>
                {(name, index) => (
                  <li key={name}>
                    <button
                      type="button"
                      aria-current={index === step ? 'step' : undefined}
                      onClick={() => setStep(index)}
                      className={cn(
                        'flex items-baseline gap-3 text-head2 transition-colors duration-400 ease-fade',
                        index === step
                          ? 'text-foreground'
                          : 'text-faint-foreground hover:text-muted-foreground',
                      )}
                    >
                      <span className="text-body typo-number">{index + 1}</span>
                      {t(`tutorial_${name}`)}
                    </button>
                  </li>
                )}
              </For>
            </ol>
            <Swap id={`${platform}-${step}`} className="flex flex-col gap-5">
              <p aria-live="polite" className="text-subtitle text-muted-foreground">
                {t(state.body)}
              </p>
              <Show when={state.warning}>
                <div className="flex flex-col gap-1 text-body">
                  <strong className="font-semibold">{t('tutorial_warning_title')}</strong>
                  <p className="text-muted-foreground">{t('tutorial_warning')}</p>
                </div>
              </Show>
            </Swap>
          </div>
        </div>
      </div>
      <DialogFooter className="items-center justify-between">
        <Button variant="quiet" size="sm" onClick={() => setReplay((value) => value + 1)}>
          {t('tutorial_replay')}
        </Button>
        <div className="flex gap-2">
          <Button variant="tonal" disabled={step === 0} onClick={() => setStep(step - 1)}>
            {t('tutorial_prev')}
          </Button>
          <Button onClick={() => (step === 2 ? close() : setStep(step + 1))}>
            {t(step === 2 ? 'tutorial_done' : 'tutorial_next')}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
};

export const TutorialDialog = () => {
  const { t } = useTranslation();
  const open = useStudio((state) => state.dialog === 'tutorial');
  return (
    <Dialog open={open} onOpenChange={(next) => !next && openDialog(null)}>
      <DialogContent closeLabel={t('btn_close')} className="max-w-3xl">
        <Show when={open}>
          <TutorialBody />
        </Show>
      </DialogContent>
    </Dialog>
  );
};

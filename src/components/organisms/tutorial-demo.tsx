import { For, Show } from '@jellybrick/react-solid-flow';
import { Check, Play, SkipBack, SkipForward } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { BrandLogo } from '@/components/atoms/brand-logo';
import { type TutorialPlatform, tutorialLoadAction } from '@/lib/tutorial';
import { cn } from '@/lib/utils';

import { PANEL_TABS, plainLabel } from './panel-tabs';

import type { PanelTab } from '@/studio/store';
import type { CSSProperties, ReactNode } from 'react';

const at = (seconds: number): CSSProperties => ({ animationDelay: `${seconds}s` });

const CLIPS = ['13:00:23', '12:59:23', '12:58:23'];

const Tap = ({ delay }: { delay: number }) => {
  return (
    <span
      className="tut-tap pointer-events-none absolute top-1/2 left-1/2 size-5 -translate-1/2 rounded-full bg-foreground"
      style={at(delay)}
    />
  );
};

const Pill = ({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) => {
  return (
    <span
      className={cn(
        'relative flex h-4 items-center justify-center rounded-full px-2 font-semibold whitespace-nowrap',
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
};

const Road = ({ className, style }: { className?: string; style?: CSSProperties }) => {
  return (
    <div className={cn('tut-road', className)} style={style}>
      <i />
      <i />
      <i />
      <span />
    </div>
  );
};

const Viewport = ({ step, className }: { step: number; className?: string }) => {
  const { t } = useTranslation();
  return (
    <div className={cn('relative overflow-hidden rounded-sm bg-stage', className)}>
      <Show when={step === 0}>
        <span
          className="tut-out absolute inset-0 flex items-center justify-center px-2 text-center text-faint-foreground"
          style={at(2)}
        >
          {t('preview_empty_title')}
        </span>
      </Show>
      <Road className={cn('absolute inset-0', step === 0 && 'tut-in')} style={at(2)} />
    </div>
  );
};

const Deck = ({ step }: { step: number }) => {
  const { t } = useTranslation();
  const ranging = step === 1;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative h-0.5 rounded-full bg-accent">
        <Show when={step > 0}>
          <span
            className={cn('absolute inset-y-0 rounded-full bg-primary', ranging && 'tut-range')}
            style={{ left: '18%', width: '60%', ...at(0.8) }}
          />
        </Show>
        <span
          className={cn(
            'absolute top-1/2 size-1.5 -translate-1/2 rounded-full bg-foreground',
            ranging && 'tut-playhead',
          )}
          style={{ left: step > 0 ? '78%' : '0%', ...at(0.8) }}
        />
      </div>
      <div className="flex items-center gap-1">
        <SkipBack className="size-2.5 text-muted-foreground" />
        <span className="flex size-4 items-center justify-center rounded-full bg-primary">
          <Play className="size-2 fill-current" />
        </span>
        <SkipForward className="size-2.5 text-muted-foreground" />
        <Pill
          className={cn('ml-1 bg-solid', step > 0 && 'bg-primary', ranging && 'tut-press')}
          style={at(0.6)}
        >
          {plainLabel(t('btn_in'))}
          <Show when={ranging}>
            <Tap delay={0.5} />
          </Show>
        </Pill>
        <Pill
          className={cn('bg-solid', step > 0 && 'bg-primary', ranging && 'tut-press')}
          style={at(2.5)}
        >
          {plainLabel(t('btn_out'))}
          <Show when={ranging}>
            <Tap delay={2.4} />
          </Show>
        </Pill>
      </div>
    </div>
  );
};

const ClipRows = ({ animate }: { animate: boolean }) => {
  return (
    <div className={cn('flex flex-col', animate && 'tut-in')} style={at(0.9)}>
      <For each={CLIPS}>
        {(time, index) => (
          <span
            key={time}
            className={cn(
              'relative flex flex-col gap-0.5 rounded-sm px-1.5 py-1',
              index === 0 && 'bg-accent',
              index === 0 && animate && 'tut-select',
            )}
            style={at(1.9)}
          >
            <span
              className={cn(
                'font-semibold typo-number',
                index === 0 && 'text-attention',
                index === 0 && animate && 'tut-select-text',
              )}
              style={at(1.9)}
            >
              {time}
            </span>
            <span className="text-muted-foreground">2025-12-21 · 4ch</span>
            {index === 0 && animate && <Tap delay={1.8} />}
          </span>
        )}
      </For>
    </div>
  );
};

const ClipsPanel = ({ step, platform }: { step: number; platform: TutorialPlatform }) => {
  const { t } = useTranslation();
  const loading = step === 0;
  return (
    <div className="relative flex-1">
      <ClipRows animate={loading} />
      <Show when={loading}>
        <div className="tut-out absolute inset-0 flex flex-col gap-1.5 px-1 pt-0.5" style={at(0.8)}>
          <span className="text-muted-foreground">{t('empty_state')}</span>
          <Pill className="h-5 bg-primary">
            {t(tutorialLoadAction(platform))}
            <Tap delay={0.5} />
          </Pill>
        </div>
      </Show>
    </div>
  );
};

const ExportPanel = () => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1.5 px-1">
      <span className="text-faint-foreground">{plainLabel(t('label_resolution'))}</span>
      <span className="truncate rounded-sm bg-solid px-1.5 py-1">{t('res_fhd')}</span>
      <Pill className="mt-1 h-5 bg-primary">
        <span className="truncate">{t('btn_export')}</span>
        <Tap delay={0.5} />
      </Pill>
      <div className="tut-in mt-1 flex flex-col gap-1" style={at(0.7)}>
        <span className="h-1 overflow-hidden rounded-full bg-accent">
          <span className="tut-fill block size-full origin-left bg-primary" style={at(0.8)} />
        </span>
        <span className="tut-in flex items-center gap-1 typo-number" style={at(3.1)}>
          <Check className="size-2.5 text-attention" />
          CT_export.mp4
        </span>
      </div>
    </div>
  );
};

const Panel = ({ step, platform }: { step: number; platform: TutorialPlatform }) => {
  const { t } = useTranslation();
  return (
    <>
      <span className="px-1 text-[11px] font-semibold">
        {t(step === 2 ? 'tab_export' : 'drawer_clips')}
      </span>
      <Show when={step === 2} fallback={<ClipsPanel step={step} platform={platform} />}>
        <ExportPanel />
      </Show>
    </>
  );
};

const activeTab = (step: number): PanelTab => (step === 2 ? 'export' : 'clips');

const DesktopDemo = ({ step }: { step: number }) => {
  return (
    <div className="flex aspect-[16/10] w-full overflow-hidden rounded-lg bg-background text-[8px] leading-tight shadow-regular">
      <nav className="m-1.5 flex w-6 shrink-0 flex-col items-center gap-1 rounded-md bg-secondary py-1.5">
        <BrandLogo className="mb-1 size-3.5" />
        <For each={PANEL_TABS}>
          {({ tab, icon: Icon }) => (
            <span
              key={tab}
              className={cn(
                'flex size-4 items-center justify-center rounded-sm',
                tab === 'settings' && 'mt-auto',
                tab === activeTab(step) ? 'bg-accent text-foreground' : 'text-faint-foreground',
              )}
            >
              <Icon className="size-2.5" />
            </span>
          )}
        </For>
      </nav>
      <aside className="flex w-[34%] shrink-0 flex-col gap-1.5 py-2 pr-1.5">
        <Panel step={step} platform="pc" />
      </aside>
      <main className="flex min-w-0 flex-1 flex-col gap-2 bg-glass-subtle p-2.5">
        <span className="text-[9px] font-semibold">CT Dashcam Studio</span>
        <Viewport step={step} className="min-h-0 flex-1" />
        <Deck step={step} />
      </main>
    </div>
  );
};

const MobileDemo = ({ step, platform }: { step: number; platform: TutorialPlatform }) => {
  const { t } = useTranslation();
  return (
    <div className="flex h-[300px] w-[150px] flex-col overflow-hidden rounded-[20px] bg-background text-[7px] leading-tight shadow-regular">
      <header className="flex items-center gap-1.5 px-2.5 pt-3 pb-1.5">
        <BrandLogo className="size-3.5" />
        <span className="text-[9px] font-semibold">CT Dashcam Studio</span>
      </header>
      <Viewport step={step} className="aspect-video w-full rounded-none" />
      <div className="bg-glass-subtle px-2 py-1.5">
        <Deck step={step} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-1.5 pt-2">
        <Panel step={step} platform={platform} />
      </div>
      <nav className="grid grid-cols-4 bg-secondary px-1 pt-1 pb-2">
        <For each={PANEL_TABS}>
          {({ tab, icon: Icon, labelKey }) => (
            <span
              key={tab}
              className={cn(
                'flex flex-col items-center gap-0.5 text-[6px]',
                tab === activeTab(step) ? 'text-foreground' : 'text-faint-foreground',
              )}
            >
              <Icon className="size-3" />
              <span className="max-w-full truncate">{t(labelKey)}</span>
            </span>
          )}
        </For>
      </nav>
    </div>
  );
};

export const TutorialDemo = ({ platform, step }: { platform: TutorialPlatform; step: number }) => {
  return (
    <div className="tutorial-demo flex w-full justify-center" aria-hidden>
      <Show when={platform === 'pc'} fallback={<MobileDemo step={step} platform={platform} />}>
        <DesktopDemo step={step} />
      </Show>
    </div>
  );
};

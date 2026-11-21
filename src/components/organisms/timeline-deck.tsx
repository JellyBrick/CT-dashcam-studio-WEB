import { For, Show } from '@jellybrick/react-solid-flow';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@/components/atoms/button';
import { Switch } from '@/components/atoms/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/molecules/dropdown-menu';
import { TimelineTrack } from '@/components/molecules/timeline-track';
import { useLayoutMode } from '@/hooks/use-layout-mode';
import { cn } from '@/lib/utils';
import { jumpToMotion, setMotionEnabled, setMotionSensitivity } from '@/studio/motion';
import { nextClip, prevClip, seekTimeline, setPlaybackSpeed, togglePlay } from '@/studio/playback';
import {
  activeRangeOverlay,
  formatTimecode,
  rangeSummary,
  resetRange,
  setInPoint,
  setOutPoint,
} from '@/studio/range';
import { getStudio, setAutoNext, type StudioState, useStudio } from '@/studio/store';
import { isSentryClip, timelineKey, timelineOf } from '@/studio/timeline';

import { plainLabel } from './panel-tabs';

import type { MotionSensitivity } from '@/core/motion-scanner';
import type { TranslationKey } from '@/i18n';
import type { TFunction } from 'i18next';

const PREVIEW_SPEEDS = [0.5, 1, 1.2, 1.5, 2, 2.5, 3, 4, 5];

const SENSITIVITY_KEYS: Record<MotionSensitivity, TranslationKey> = {
  low: 'sens_low',
  normal: 'sens_normal',
  high: 'sens_high',
  ultra: 'sens_ultra',
};

const motionStatus = ({ motion }: StudioState, t: TFunction) => {
  if (!motion) return '';
  if (motion.failed) return t('motion_failed');
  if (!motion.events) return t('motion_scanning', { 0: motion.pct });
  return t('motion_detected', { 0: motion.events.length });
};

const Scrubber = () => {
  const { t } = useTranslation();
  const currentTimeSec = useStudio((state) => timelineOf(state).positionSec);
  const durationSec = useStudio((state) => timelineOf(state).totalSec);
  const range = useStudio(useShallow(activeRangeOverlay));
  const exporting = useStudio((state) => state.exportProgress !== null);
  const motionEvents = useStudio((state) =>
    state.motion && state.motion.key === timelineKey(state) ? state.motion.events : null,
  );
  const marks =
    durationSec > 0
      ? (motionEvents ?? []).map(({ startSec, endSec }) => ({
          left: (startSec / durationSec) * 100,
          width: ((endSec - startSec) / durationSec) * 100,
        }))
      : [];
  return (
    <div className="flex items-center gap-3 text-body typo-number">
      <span className="w-14 shrink-0">{formatTimecode(currentTimeSec)}</span>
      <TimelineTrack
        label={t('tip_play_main')}
        valueText={`${formatTimecode(currentTimeSec)} / ${formatTimecode(durationSec)}`}
        hoverText={(ratio) => formatTimecode(ratio * durationSec)}
        progress={durationSec > 0 ? (currentTimeSec / durationSec) * 100 : 0}
        range={range}
        marks={marks}
        disabled={exporting}
        onSeek={(ratio) => {
          seekTimeline(ratio * timelineOf(getStudio()).totalSec).catch(reportError);
        }}
        className="flex-1"
      />
      <span className="w-14 shrink-0 text-right text-muted-foreground">
        {formatTimecode(durationSec)}
      </span>
    </div>
  );
};

const Transport = () => {
  const { t } = useTranslation();
  const playing = useStudio((state) => state.isPlaying);
  const exporting = useStudio((state) => state.exportProgress !== null);
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        variant="quiet"
        size="icon"
        aria-label={t('tip_prev_clip')}
        title={t('tip_prev_clip')}
        onClick={() => {
          prevClip().catch(reportError);
        }}
      >
        <SkipBack />
      </Button>
      <Button
        size="icon-round"
        aria-label={t('tip_play_main')}
        title={t('tip_play_main')}
        disabled={exporting}
        onClick={togglePlay}
      >
        <Show when={playing} fallback={<Play className="translate-x-px fill-current" />}>
          <Pause className="fill-current" />
        </Show>
      </Button>
      <Button
        variant="quiet"
        size="icon"
        aria-label={t('tip_next_clip')}
        title={t('tip_next_clip')}
        onClick={() => {
          nextClip().catch(reportError);
        }}
      >
        <SkipForward />
      </Button>
    </div>
  );
};

const RangeControls = () => {
  const { t } = useTranslation();
  const compact = useLayoutMode() !== 'desktop';
  const summary = useStudio((state) => rangeSummary(state, t));
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-1.5',
        compact ? 'order-last basis-full' : 'flex-1',
      )}
    >
      <Button variant="solid" size="sm" title={t('tip_set_in')} onClick={setInPoint}>
        {plainLabel(t('btn_in'))}
      </Button>
      <Button variant="solid" size="sm" title={t('tip_set_out')} onClick={setOutPoint}>
        {plainLabel(t('btn_out'))}
      </Button>
      <Button
        variant="quiet"
        size="icon-sm"
        aria-label={t('tip_reset_range')}
        title={t('tip_reset_range')}
        onClick={resetRange}
      >
        <RotateCcw />
      </Button>
      <span className="min-w-0 truncate pl-1 text-body text-muted-foreground">{summary}</span>
    </div>
  );
};

const SpeedMenu = () => {
  const { t } = useTranslation();
  const speed = useStudio((state) => state.options.playbackSpeed);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="solid"
            size="sm"
            aria-label={t('lbl_speed')}
            title={t('tip_restore_speed')}
          />
        }
        onDoubleClick={() => setPlaybackSpeed(1)}
      >
        <span className="typo-number">{speed}x</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="min-w-28">
        <DropdownMenuRadioGroup
          value={speed}
          onValueChange={(value: number) => setPlaybackSpeed(value)}
        >
          <For each={PREVIEW_SPEEDS}>
            {(value) => (
              <DropdownMenuRadioItem key={value} value={value} className="typo-number">
                {value}x
              </DropdownMenuRadioItem>
            )}
          </For>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const AutoNext = () => {
  const { t } = useTranslation();
  const autoNext = useStudio((state) => state.autoNext);
  return (
    <label className="flex cursor-pointer items-center gap-2 text-body text-muted-foreground">
      <Switch checked={autoNext} onCheckedChange={setAutoNext} />
      {t('chk_auto_next')}
    </label>
  );
};

const SensitivityMenu = () => {
  const { t } = useTranslation();
  const sensitivity = useStudio((state) => state.motionSensitivity);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="solid" size="sm" />}>
        {t('lbl_sensitivity')}: {t(SENSITIVITY_KEYS[sensitivity])}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="min-w-28">
        <DropdownMenuRadioGroup
          value={sensitivity}
          onValueChange={(value: MotionSensitivity) => setMotionSensitivity(value)}
        >
          <For each={Object.keys(SENSITIVITY_KEYS) as MotionSensitivity[]}>
            {(value) => (
              <DropdownMenuRadioItem key={value} value={value}>
                {t(SENSITIVITY_KEYS[value])}
              </DropdownMenuRadioItem>
            )}
          </For>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const MotionControls = () => {
  const { t } = useTranslation();
  const sentry = useStudio((state) => isSentryClip(state.activeClip));
  const enabled = useStudio((state) => state.motionEnabled);
  const status = useStudio((state) => motionStatus(state, t));
  const hasEvents = useStudio((state) => (state.motion?.events?.length ?? 0) > 0);
  return (
    <Show when={sentry}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-body text-muted-foreground">
          <Switch checked={enabled} onCheckedChange={setMotionEnabled} />
          {t('chk_motion')}
        </label>
        <Show when={enabled}>
          <SensitivityMenu />
          <span className="min-w-0 truncate text-body text-muted-foreground typo-number">
            {status}
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Button
              variant="quiet"
              size="sm"
              title={t('tip_prev_motion')}
              disabled={!hasEvents}
              onClick={() => jumpToMotion(-1)}
            >
              <ChevronLeft />
              {t('btn_prev_motion')}
            </Button>
            <Button
              variant="quiet"
              size="sm"
              title={t('tip_next_motion')}
              disabled={!hasEvents}
              onClick={() => jumpToMotion(1)}
            >
              {t('btn_next_motion')}
              <ChevronRight />
            </Button>
          </div>
        </Show>
      </div>
    </Show>
  );
};

export const TimelineDeck = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Scrubber />
      <MotionControls />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Transport />
        <RangeControls />
        <div className="ml-auto flex shrink-0 items-center gap-4">
          <SpeedMenu />
          <AutoNext />
        </div>
      </div>
    </div>
  );
};

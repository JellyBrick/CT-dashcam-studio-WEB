import { offset, shift, useFloating } from '@floating-ui/react-dom';
import { For, Show } from '@jellybrick/react-solid-flow';
import { useGesture } from '@use-gesture/react';
import { clamp } from 'es-toolkit';
import { useRef, useState } from 'react';

import { cn } from '@/lib/utils';

interface TimelineTrackProps {
  progress: number;
  range: { left: number; width: number; start: boolean; end: boolean } | null;
  marks?: { left: number; width: number }[];
  label: string;
  valueText: string;
  hoverText: (ratio: number) => string;
  disabled?: boolean;
  onSeek: (ratio: number) => void;
  className?: string;
}

export const TimelineTrack = ({
  progress,
  range,
  marks = [],
  label,
  valueText,
  hoverText,
  disabled,
  onSeek,
  className,
}: TimelineTrackProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const {
    refs: { setReference, setFloating },
    floatingStyles,
  } = useFloating({
    placement: 'top',
    middleware: [offset(12), shift({ padding: 8 })],
  });

  const ratioAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return null;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    const x = rect.left + ratio * rect.width;
    setReference({
      getBoundingClientRect: () =>
        DOMRect.fromRect({ x, y: rect.top, width: 0, height: rect.height }),
    });
    return ratio;
  };

  const bind = useGesture(
    {
      onDrag: ({ last, xy: [x] }) => {
        if (last) return;
        const ratio = ratioAt(x);
        if (ratio !== null) onSeek(ratio);
      },
      onPointerMove: ({ event }) => {
        if (event.pointerType === 'mouse') setHoverRatio(ratioAt(event.clientX));
      },
      onPointerLeave: () => setHoverRatio(null),
    },
    { drag: { enabled: !disabled, preventDefault: true, pointer: { keys: false } } },
  );

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      aria-valuetext={valueText}
      aria-disabled={disabled}
      className={cn(
        'group/track flex h-6 cursor-pointer touch-none items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className,
      )}
      {...bind()}
    >
      <div
        ref={trackRef}
        className="relative h-1 w-full rounded-full bg-accent transition-[height] duration-400 ease-spring group-hover/track:h-1.5"
      >
        <Show when={range}>
          {({ left, width, start, end }) => (
            <>
              <div
                className="absolute -inset-y-1 rounded-[3px] bg-foreground/15"
                style={{ left: `${left}%`, width: `${width}%` }}
              />
              <Show when={start}>
                <span
                  aria-hidden
                  className="absolute -inset-y-2 w-2 -translate-x-px rounded-l-[3px] border-[2.5px] border-r-0 border-foreground"
                  style={{ left: `${left}%` }}
                />
              </Show>
              <Show when={end}>
                <span
                  aria-hidden
                  className="absolute -inset-y-2 w-2 -translate-x-[calc(100%-1px)] rounded-r-[3px] border-[2.5px] border-l-0 border-foreground"
                  style={{ left: `${left + width}%` }}
                />
              </Show>
            </>
          )}
        </Show>
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
          style={{ width: `${progress}%` }}
        />
        <For each={marks}>
          {({ left, width }) => (
            <span
              key={left}
              aria-hidden
              className="absolute inset-y-0 rounded-full bg-destructive/80"
              style={{ left: `${left}%`, width: `max(${width}%, 3px)` }}
            />
          )}
        </For>
        <div
          className="absolute top-1/2 size-3.5 -translate-1/2 rounded-full bg-foreground shadow-regular ring-2 ring-black/40"
          style={{ left: `${progress}%` }}
        />
      </div>
      <Show when={hoverRatio !== null}>
        <span
          ref={setFloating}
          style={floatingStyles}
          className="pointer-events-none z-40 animate-in rounded-sm bg-popover px-2 py-1 text-body shadow-regular duration-200 fade-in-0 typo-number"
        >
          {hoverText(hoverRatio ?? 0)}
        </span>
      </Show>
    </div>
  );
};

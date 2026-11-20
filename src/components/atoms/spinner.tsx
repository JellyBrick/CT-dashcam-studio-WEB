import { For } from '@jellybrick/react-solid-flow';

import { cn } from '@/lib/utils';

import type { ComponentProps } from 'react';

const DELAYS = ['0s', '0.4s', '0.8s'];

const Spinner = ({ className, ...props }: ComponentProps<'span'>) => {
  return (
    <span
      data-slot="spinner"
      className={cn('inline-flex h-[1em] items-center gap-[0.15em]', className)}
      {...props}
    >
      <For each={DELAYS}>
        {(delay) => (
          <span
            key={delay}
            className="size-[0.3em] animate-loader-dot rounded-full bg-current"
            style={{ animationDelay: delay }}
          />
        )}
      </For>
    </span>
  );
};

export { Spinner };

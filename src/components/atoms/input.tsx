import { Show } from '@jellybrick/react-solid-flow';

import { cn } from '@/lib/utils';

import type { ComponentProps, ReactNode } from 'react';

export const Input = ({
  icon,
  end,
  className,
  ...props
}: ComponentProps<'input'> & { icon?: ReactNode; end?: ReactNode }) => (
  <label
    className={cn(
      'group/input flex items-center gap-3 rounded-sm bg-glass-subtle px-4 py-3 text-muted-foreground backdrop-blur-regular transition-shadow duration-400 ease-fade focus-within:shadow-[inset_0_0_0_2px_var(--color-primary)]',
      className,
    )}
  >
    <Show when={icon}>
      <span className="flex size-5 shrink-0 items-center justify-center transition-colors duration-400 ease-fade group-has-[input:not(:placeholder-shown)]/input:text-foreground [&_svg]:size-5">
        {icon}
      </span>
    </Show>
    <input
      className="min-h-6 w-full min-w-0 bg-transparent text-head3 text-foreground outline-none placeholder:text-muted-foreground"
      {...props}
    />
    <Show when={end !== undefined}>
      <span className="flex size-6 shrink-0 items-center justify-center">{end}</span>
    </Show>
  </label>
);

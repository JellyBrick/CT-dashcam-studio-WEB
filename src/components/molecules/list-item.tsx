import { Show } from '@jellybrick/react-solid-flow';

import { ActiveIndicator } from '@/components/atoms/active-indicator';
import { cn } from '@/lib/utils';

import type { ComponentProps, ReactNode } from 'react';

interface ListItemProps extends Omit<ComponentProps<'button'>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  active?: boolean;
  activeGroup?: string;
  highlighted?: boolean;
}

export const ListItem = ({
  title,
  description,
  meta,
  active = false,
  activeGroup = 'list-item',
  highlighted = false,
  className,
  ...props
}: ListItemProps) => {
  return (
    <button
      type="button"
      aria-current={active || undefined}
      className={cn(
        'relative flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left outline-2 outline-transparent transition-[background-color,outline-color] duration-400 ease-fade hover:bg-muted focus-visible:outline-primary',
        active && 'hover:bg-transparent',
        className,
      )}
      {...props}
    >
      <Show when={active}>
        <ActiveIndicator layoutId={activeGroup} className="rounded-lg" />
      </Show>
      <span className="relative flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn('truncate text-head3 typo-number', highlighted && 'text-attention')}>
          {title}
        </span>
        <Show when={description}>
          <span className="truncate text-body text-muted-foreground">{description}</span>
        </Show>
      </span>
      <Show when={meta}>
        <span className="relative shrink-0 text-fineprint text-muted-foreground typo-number">
          {meta}
        </span>
      </Show>
    </button>
  );
};

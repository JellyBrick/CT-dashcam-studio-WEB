import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';
import { Show } from '@jellybrick/react-solid-flow';
import { createContext, use, useId } from 'react';

import { ActiveIndicator } from '@/components/atoms/active-indicator';
import { cn } from '@/lib/utils';

const ToggleGroupContext = createContext('toggle-group');

const ToggleGroup = ({ className, ...props }: ToggleGroupPrimitive.Props) => (
  <ToggleGroupContext value={useId()}>
    <ToggleGroupPrimitive
      className={cn('flex w-fit items-center rounded-full bg-secondary p-1', className)}
      {...props}
    />
  </ToggleGroupContext>
);

const ToggleGroupItem = ({ className, ...props }: TogglePrimitive.Props) => {
  const groupId = use(ToggleGroupContext);
  return (
    <TogglePrimitive
      className={cn(
        'relative flex h-8 flex-1 items-center justify-center rounded-full px-3 text-body font-semibold whitespace-nowrap text-faint-foreground outline-none transition-colors duration-400 ease-fade hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary data-pressed:text-foreground',
        className,
      )}
      render={(buttonProps, { pressed }) => (
        <button type="button" {...buttonProps}>
          <Show when={pressed}>
            <ActiveIndicator layoutId={groupId} className="rounded-full" />
          </Show>
          <span className="relative flex items-center gap-1.5">{buttonProps.children}</span>
        </button>
      )}
      {...props}
    />
  );
};

export { ToggleGroup, ToggleGroupItem };

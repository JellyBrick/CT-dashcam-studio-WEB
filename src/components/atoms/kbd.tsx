import { cn } from '@/lib/utils';

import type { ComponentProps } from 'react';

const Kbd = ({ className, ...props }: ComponentProps<'kbd'>) => {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'pointer-events-none inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-accent px-1.5 font-sans text-body font-medium text-foreground select-none',
        className,
      )}
      {...props}
    />
  );
};

export { Kbd };

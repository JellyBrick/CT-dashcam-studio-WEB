import { m } from 'motion/react';

import { cn } from '@/lib/utils';

export const ActiveIndicator = ({
  layoutId,
  className,
}: {
  layoutId: string;
  className?: string;
}) => (
  <m.span
    aria-hidden
    layoutId={layoutId}
    transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
    className={cn('absolute inset-0 bg-accent', className)}
  />
);

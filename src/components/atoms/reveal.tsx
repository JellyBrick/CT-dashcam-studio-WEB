import { AnimatePresence, m } from 'motion/react';

import type { ReactNode } from 'react';

export const Reveal = ({
  show,
  className,
  children,
}: {
  show: boolean;
  className?: string;
  children: ReactNode;
}) => (
  <AnimatePresence initial={false}>
    {show && (
      <m.div
        key="reveal"
        className="overflow-hidden"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{
          height: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
          opacity: { duration: 0.4, ease: [0.55, 0.15, 0.25, 0.95] },
        }}
      >
        <div className={className}>{children}</div>
      </m.div>
    )}
  </AnimatePresence>
);

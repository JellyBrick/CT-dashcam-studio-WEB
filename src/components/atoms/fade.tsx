import { AnimatePresence, m } from 'motion/react';

import type { ReactNode } from 'react';

export const Fade = ({
  show,
  className,
  children,
}: {
  show: boolean;
  className?: string;
  children: ReactNode;
}) => (
  <AnimatePresence>
    {show && (
      <m.div
        key="fade"
        className={className}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.55, 0.15, 0.25, 0.95] }}
      >
        {children}
      </m.div>
    )}
  </AnimatePresence>
);

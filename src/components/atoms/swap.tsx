import { AnimatePresence, m } from 'motion/react';

import type { ReactNode } from 'react';

const variants = {
  rise: { hidden: { opacity: 0, y: 8 }, shown: { opacity: 1, y: 0 } },
  scale: { hidden: { opacity: 0, scale: 0.9 }, shown: { opacity: 1, scale: 1 } },
};

export const Swap = ({
  id,
  variant = 'rise',
  className,
  children,
}: {
  id: string;
  variant?: keyof typeof variants;
  className?: string;
  children: ReactNode;
}) => (
  <AnimatePresence mode="popLayout" initial={false}>
    <m.div
      key={id}
      className={className}
      initial={variants[variant].hidden}
      animate={{
        ...variants[variant].shown,
        transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
      }}
      exit={{
        ...variants[variant].hidden,
        transition: { duration: 0.15, ease: [0.55, 0.15, 0.25, 0.95] },
      }}
    >
      {children}
    </m.div>
  </AnimatePresence>
);

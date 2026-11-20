import { m } from 'motion/react';
import { useState } from 'react';

import type { ReactNode } from 'react';

export const AutoHeight = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) => {
  const [height, setHeight] = useState<number | 'auto'>('auto');
  const measure = (element: HTMLDivElement | null) => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setHeight(entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  };
  return (
    <m.div
      initial={false}
      animate={{ height }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div ref={measure} className={className}>
        {children}
      </div>
    </m.div>
  );
};

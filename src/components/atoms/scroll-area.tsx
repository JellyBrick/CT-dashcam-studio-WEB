import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';

import { cn } from '@/lib/utils';

import type { Ref } from 'react';

const ScrollArea = ({
  className,
  children,
  viewportRef,
  ...props
}: ScrollAreaPrimitive.Root.Props & { viewportRef?: Ref<HTMLDivElement> }) => {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn('relative min-h-0', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        className="size-full overscroll-contain outline-none fade-edges group-data-[layout=portrait]/studio:overscroll-auto"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar
        orientation="vertical"
        className="group/scrollbar flex w-2 justify-end py-4 opacity-0 transition-[opacity,width] duration-400 ease-fade hover:w-3 data-hovering:opacity-100 data-scrolling:opacity-100"
      >
        <ScrollAreaPrimitive.Thumb className="w-full rounded-full border-2 border-transparent bg-glass bg-clip-padding" />
      </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>
  );
};

export { ScrollArea };

import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';

import { cn } from '@/lib/utils';

import { backdrop } from './dialog-classes';

const Sheet = SheetPrimitive.Root;
const SheetTitle = SheetPrimitive.Title;

const sides = {
  bottom:
    'inset-x-0 bottom-0 rounded-t-xl data-starting-style:translate-y-full data-ending-style:translate-y-full',
  left: 'inset-y-0 left-0 data-starting-style:-translate-x-full data-ending-style:-translate-x-full',
};

const SheetContent = ({
  className,
  side = 'left',
  ...props
}: SheetPrimitive.Popup.Props & { side?: keyof typeof sides }) => {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Backdrop className={backdrop} />
      <SheetPrimitive.Popup
        className={cn(
          'fixed z-50 flex flex-col bg-card text-card-foreground shadow-regular outline-none transition-transform duration-600 ease-spring',
          sides[side],
          className,
        )}
        {...props}
      />
    </SheetPrimitive.Portal>
  );
};

export { Sheet, SheetContent, SheetTitle };

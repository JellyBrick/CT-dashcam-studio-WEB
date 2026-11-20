import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';

import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = ({
  className,
  side = 'top',
  sideOffset = 8,
  align = 'center',
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, 'align' | 'side' | 'sideOffset'>) => {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        className="z-50"
      >
        <TooltipPrimitive.Popup
          className={cn(
            'max-w-xs origin-(--transform-origin) rounded-md bg-popover px-3 py-2 text-body text-popover-foreground shadow-regular transition-[opacity,scale] duration-200 ease-fade data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:opacity-0',
            className,
          )}
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
};

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };

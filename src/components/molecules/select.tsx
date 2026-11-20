import { Select as SelectPrimitive } from '@base-ui/react/select';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import { menuIndicator, menuItem, popupSurface } from './menu-classes';

const Select = SelectPrimitive.Root;

const SelectValue = ({ className, ...props }: SelectPrimitive.Value.Props) => {
  return (
    <SelectPrimitive.Value className={cn('flex-1 truncate text-left', className)} {...props} />
  );
};

const SelectTrigger = ({ className, children, ...props }: SelectPrimitive.Trigger.Props) => {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex h-10 items-center gap-2 rounded-md bg-solid px-3.5 text-subtitle text-solid-foreground outline-none transition-shadow duration-400 ease-fade focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset data-disabled:opacity-45 data-popup-open:ring-2 data-popup-open:ring-primary data-popup-open:ring-inset',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="text-muted-foreground">
        <ChevronDownIcon className="size-4" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
};

const SelectContent = ({ className, children, ...props }: SelectPrimitive.Popup.Props) => {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner sideOffset={6} alignItemWithTrigger={false} className="z-50">
        <SelectPrimitive.Popup
          className={cn(
            popupSurface,
            'max-h-(--available-height) min-w-(--anchor-width) overflow-y-auto',
            className,
          )}
          {...props}
        >
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
};

const SelectItem = ({ className, children, ...props }: SelectPrimitive.Item.Props) => {
  return (
    <SelectPrimitive.Item className={cn(menuItem, className)} {...props}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className={menuIndicator}>
        <CheckIcon />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
};

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };

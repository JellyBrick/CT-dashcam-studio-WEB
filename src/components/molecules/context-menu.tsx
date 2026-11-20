import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu';
import { CheckIcon, ChevronRightIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import {
  menuIndicator,
  menuItem,
  menuLabel,
  menuSeparator,
  menuShortcut,
  popupSurface,
} from './menu-classes';

import type { ComponentProps } from 'react';

const ContextMenu = ContextMenuPrimitive.Root;
const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
const ContextMenuGroup = ContextMenuPrimitive.Group;
const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;
const ContextMenuSub = ContextMenuPrimitive.SubmenuRoot;

const ContextMenuContent = ({ className, ...props }: ContextMenuPrimitive.Popup.Props) => {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Positioner className="z-50">
        <ContextMenuPrimitive.Popup
          className={cn(popupSurface, 'min-w-56', className)}
          {...props}
        />
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  );
};

const ContextMenuSubContent = ({ className, ...props }: ContextMenuPrimitive.Popup.Props) => {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Positioner side="right" align="start" sideOffset={4} className="z-50">
        <ContextMenuPrimitive.Popup
          className={cn(popupSurface, 'min-w-48', className)}
          {...props}
        />
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  );
};

const ContextMenuItem = ({ className, ...props }: ContextMenuPrimitive.Item.Props) => {
  return <ContextMenuPrimitive.Item className={cn(menuItem, className)} {...props} />;
};

const ContextMenuRadioItem = ({
  className,
  children,
  ...props
}: ContextMenuPrimitive.RadioItem.Props) => {
  return (
    <ContextMenuPrimitive.RadioItem className={cn(menuItem, className)} {...props}>
      {children}
      <ContextMenuPrimitive.RadioItemIndicator className={menuIndicator}>
        <CheckIcon />
      </ContextMenuPrimitive.RadioItemIndicator>
    </ContextMenuPrimitive.RadioItem>
  );
};

const ContextMenuSubTrigger = ({
  className,
  children,
  ...props
}: ContextMenuPrimitive.SubmenuTrigger.Props) => {
  return (
    <ContextMenuPrimitive.SubmenuTrigger
      className={cn(menuItem, 'data-popup-open:bg-accent', className)}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto text-muted-foreground" />
    </ContextMenuPrimitive.SubmenuTrigger>
  );
};

const ContextMenuLabel = ({ className, ...props }: ContextMenuPrimitive.GroupLabel.Props) => {
  return <ContextMenuPrimitive.GroupLabel className={cn(menuLabel, className)} {...props} />;
};

const ContextMenuSeparator = ({ className, ...props }: ContextMenuPrimitive.Separator.Props) => {
  return <ContextMenuPrimitive.Separator className={cn(menuSeparator, className)} {...props} />;
};

const ContextMenuShortcut = ({ className, ...props }: ComponentProps<'span'>) => {
  return <span className={cn(menuShortcut, className)} {...props} />;
};

export {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
};

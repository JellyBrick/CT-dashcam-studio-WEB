import { Menu as MenuPrimitive } from '@base-ui/react/menu';
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

const DropdownMenu = MenuPrimitive.Root;
const DropdownMenuTrigger = MenuPrimitive.Trigger;
const DropdownMenuGroup = MenuPrimitive.Group;
const DropdownMenuRadioGroup = MenuPrimitive.RadioGroup;
const DropdownMenuSub = MenuPrimitive.SubmenuRoot;

const DropdownMenuContent = ({
  className,
  side = 'bottom',
  align = 'start',
  sideOffset = 6,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, 'side' | 'align' | 'sideOffset'>) => {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner side={side} align={align} sideOffset={sideOffset} className="z-50">
        <MenuPrimitive.Popup className={cn(popupSurface, 'min-w-48', className)} {...props} />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
};

const DropdownMenuItem = ({ className, ...props }: MenuPrimitive.Item.Props) => {
  return <MenuPrimitive.Item className={cn(menuItem, className)} {...props} />;
};

const DropdownMenuRadioItem = ({
  className,
  children,
  ...props
}: MenuPrimitive.RadioItem.Props) => {
  return (
    <MenuPrimitive.RadioItem className={cn(menuItem, className)} {...props}>
      {children}
      <MenuPrimitive.RadioItemIndicator className={menuIndicator}>
        <CheckIcon />
      </MenuPrimitive.RadioItemIndicator>
    </MenuPrimitive.RadioItem>
  );
};

const DropdownMenuCheckboxItem = ({
  className,
  children,
  ...props
}: MenuPrimitive.CheckboxItem.Props) => {
  return (
    <MenuPrimitive.CheckboxItem className={cn(menuItem, className)} {...props}>
      {children}
      <MenuPrimitive.CheckboxItemIndicator className={menuIndicator}>
        <CheckIcon />
      </MenuPrimitive.CheckboxItemIndicator>
    </MenuPrimitive.CheckboxItem>
  );
};

const DropdownMenuSubTrigger = ({
  className,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props) => {
  return (
    <MenuPrimitive.SubmenuTrigger
      className={cn(menuItem, 'data-popup-open:bg-accent', className)}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto text-muted-foreground" />
    </MenuPrimitive.SubmenuTrigger>
  );
};

const DropdownMenuSubContent = (props: ComponentProps<typeof DropdownMenuContent>) => {
  return <DropdownMenuContent side="right" align="start" sideOffset={4} {...props} />;
};

const DropdownMenuLabel = ({ className, ...props }: MenuPrimitive.GroupLabel.Props) => {
  return <MenuPrimitive.GroupLabel className={cn(menuLabel, className)} {...props} />;
};

const DropdownMenuSeparator = ({ className, ...props }: MenuPrimitive.Separator.Props) => {
  return <MenuPrimitive.Separator className={cn(menuSeparator, className)} {...props} />;
};

const DropdownMenuShortcut = ({ className, ...props }: ComponentProps<'span'>) => {
  return <span className={cn(menuShortcut, className)} {...props} />;
};

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};

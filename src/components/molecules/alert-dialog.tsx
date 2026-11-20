import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';

import { cn } from '@/lib/utils';

import { backdrop, popup, popupBody } from './dialog-classes';

import type { ReactNode } from 'react';

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogClose = AlertDialogPrimitive.Close;

const AlertDialogContent = ({
  className,
  children,
  ...props
}: AlertDialogPrimitive.Popup.Props & { children: ReactNode }) => (
  <AlertDialogPrimitive.Portal>
    <AlertDialogPrimitive.Backdrop className={backdrop} />
    <AlertDialogPrimitive.Popup className={cn(popup, 'max-w-sm')} {...props}>
      <div className={cn(popupBody, className)}>{children}</div>
    </AlertDialogPrimitive.Popup>
  </AlertDialogPrimitive.Portal>
);

const AlertDialogTitle = ({ className, ...props }: AlertDialogPrimitive.Title.Props) => {
  return <AlertDialogPrimitive.Title className={cn('text-head3', className)} {...props} />;
};

const AlertDialogDescription = ({
  className,
  ...props
}: AlertDialogPrimitive.Description.Props) => {
  return (
    <AlertDialogPrimitive.Description
      className={cn('-mt-4 text-subtitle text-muted-foreground', className)}
      {...props}
    />
  );
};

export {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
};

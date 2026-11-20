import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Show } from '@jellybrick/react-solid-flow';
import { XIcon } from 'lucide-react';

import { AutoHeight } from '@/components/atoms/auto-height';
import { Button } from '@/components/atoms/button';
import { cn } from '@/lib/utils';

import { backdrop, popup, popupBody } from './dialog-classes';

import type { ComponentProps } from 'react';

const Dialog = DialogPrimitive.Root;
const DialogClose = DialogPrimitive.Close;

const placements = {
  center: '',
  corner:
    'top-auto left-auto right-6 bottom-6 max-w-sm translate-0 max-sm:right-3 max-sm:bottom-[calc(80px+env(safe-area-inset-bottom))] max-sm:w-[calc(100vw-1.5rem)]',
};

const DialogContent = ({
  className,
  bodyClassName,
  children,
  closeLabel,
  placement = 'center',
  autoHeight = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  bodyClassName?: string;
  closeLabel?: string;
  placement?: keyof typeof placements;
  autoHeight?: boolean;
}) => (
  <DialogPrimitive.Portal>
    <Show when={placement === 'center'}>
      <DialogPrimitive.Backdrop className={backdrop} />
    </Show>
    <DialogPrimitive.Popup className={cn(popup, placements[placement], className)} {...props}>
      <Show
        when={autoHeight}
        fallback={<div className={cn(popupBody, bodyClassName)}>{children}</div>}
      >
        <AutoHeight className={cn(popupBody, bodyClassName)}>{children}</AutoHeight>
      </Show>
      <Show when={closeLabel}>
        <DialogPrimitive.Close
          render={<Button variant="quiet" size="icon-sm" className="absolute top-4 right-4" />}
        >
          <XIcon />
          <span className="sr-only">{closeLabel}</span>
        </DialogPrimitive.Close>
      </Show>
    </DialogPrimitive.Popup>
  </DialogPrimitive.Portal>
);

const DialogHeader = ({ className, ...props }: ComponentProps<'div'>) => {
  return <div className={cn('flex flex-col gap-1 pr-10', className)} {...props} />;
};

const DialogFooter = ({ className, ...props }: ComponentProps<'div'>) => {
  return <div className={cn('flex justify-end gap-2', className)} {...props} />;
};

const DialogTitle = ({ className, ...props }: DialogPrimitive.Title.Props) => {
  return <DialogPrimitive.Title className={cn('text-head2', className)} {...props} />;
};

const DialogDescription = ({ className, ...props }: DialogPrimitive.Description.Props) => {
  return (
    <DialogPrimitive.Description
      className={cn('text-subtitle text-muted-foreground', className)}
      {...props}
    />
  );
};

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
};

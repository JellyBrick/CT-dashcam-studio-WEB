import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = (props: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-[var(--width)] items-start gap-3 rounded-lg bg-popover p-4 text-subtitle text-popover-foreground shadow-regular',
          title: 'text-title',
          description: 'mt-1 text-body text-muted-foreground',
          actionButton: 'rounded-full bg-primary px-3 py-1.5 text-body font-semibold',
          closeButton: 'text-muted-foreground',
          error: '[&_[data-title]]:text-destructive',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

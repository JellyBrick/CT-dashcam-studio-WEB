import { Show } from '@jellybrick/react-solid-flow';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { Button } from '@/components/atoms/button';
import { cn } from '@/lib/utils';

import type { ComponentProps, ReactNode } from 'react';

type ButtonProps = ComponentProps<typeof Button>;

interface FilePickButtonProps {
  label: string;
  children?: ReactNode;
  onPick: (files: File[]) => void;
  onActivate?: () => void;
  onCancel?: () => void;
  onClick?: () => void;
  directory?: boolean;
  native?: boolean;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
}

export const FilePickButton = ({
  label,
  children,
  onPick,
  onActivate,
  onCancel,
  onClick,
  directory = false,
  native = true,
  variant,
  size = 'lg',
  className,
}: FilePickButtonProps) => {
  const iconOnly = size?.startsWith('icon') ?? false;
  const [generation, setGeneration] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCancel = useEffectEvent(() => onCancel?.());

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.webkitdirectory = directory;
    if (directory) input.setAttribute('directory', '');
    input.addEventListener('cancel', handleCancel);
    return () => input.removeEventListener('cancel', handleCancel);
  }, [generation, directory, native]);

  return (
    <div className={cn('relative', iconOnly && 'inline-flex', className)}>
      <Button
        variant={variant}
        size={size}
        className={iconOnly ? undefined : 'w-full'}
        tabIndex={native ? -1 : undefined}
        aria-hidden={native || undefined}
        aria-label={children ? label : undefined}
        title={children ? label : undefined}
        onClick={native ? undefined : onClick}
      >
        {children ?? label}
      </Button>
      <Show when={native}>
        <input
          key={generation}
          ref={inputRef}
          type="file"
          multiple
          accept="video/mp4,.mp4,.json"
          aria-label={label}
          title={label}
          className="absolute inset-0 size-full cursor-pointer rounded-full opacity-0"
          onClick={onActivate}
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            setGeneration((value) => value + 1);
            onPick(files);
          }}
        />
      </Show>
    </div>
  );
};

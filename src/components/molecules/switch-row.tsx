import { Switch } from '@/components/atoms/switch';

import type { ReactNode } from 'react';

interface SwitchRowProps {
  label: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  description?: string;
  title?: string;
}

export const SwitchRow = ({
  label,
  checked,
  onCheckedChange,
  disabled,
  description,
  title,
}: SwitchRowProps) => {
  return (
    <label
      title={title}
      className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-md px-3 transition-colors duration-400 ease-fade hover:bg-muted has-data-disabled:cursor-not-allowed has-data-disabled:opacity-45 has-data-disabled:hover:bg-transparent"
    >
      <span className="flex min-w-0 items-center gap-1.5 text-subtitle">{label}</span>
      <Switch
        checked={checked}
        disabled={disabled}
        aria-description={description}
        onCheckedChange={onCheckedChange}
      />
    </label>
  );
};

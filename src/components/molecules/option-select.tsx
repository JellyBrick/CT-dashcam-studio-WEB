import { For } from '@jellybrick/react-solid-flow';

import { cn } from '@/lib/utils';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

export interface SelectOption<T> {
  value: T;
  label: string;
}

interface OptionSelectProps<T> {
  value: T;
  options: SelectOption<T>[];
  onValueChange: (value: T) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const OptionSelect = <T extends string | number>({
  value,
  options,
  onValueChange,
  label,
  disabled,
  className,
}: OptionSelectProps<T>) => {
  return (
    <Select
      items={options}
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next);
      }}
    >
      <SelectTrigger aria-label={label} className={cn('w-full', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <For each={options}>
          {(option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          )}
        </For>
      </SelectContent>
    </Select>
  );
};

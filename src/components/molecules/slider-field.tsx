import { Slider } from '@/components/atoms/slider';

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  valueText: string;
  onValueChange: (value: number) => void;
  onReset: () => void;
  resetTitle?: string;
}

export const SliderField = ({
  label,
  value,
  min,
  max,
  valueText,
  onValueChange,
  onReset,
  resetTitle,
}: SliderFieldProps) => {
  return (
    <div className="flex flex-col gap-2 px-3">
      <div className="flex items-baseline justify-between gap-3">
        <button
          type="button"
          title={resetTitle}
          onDoubleClick={onReset}
          className="text-subtitle text-foreground"
        >
          {label}
        </button>
        <span className="text-body text-muted-foreground typo-number">{valueText}</span>
      </div>
      <Slider aria-label={label} min={min} max={max} value={value} onValueChange={onValueChange} />
    </div>
  );
};

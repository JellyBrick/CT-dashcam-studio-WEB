import { Show } from '@jellybrick/react-solid-flow';

import { Progress } from '@/components/atoms/progress';
import { Spinner } from '@/components/atoms/spinner';

interface ProgressPanelProps {
  title: string;
  detail: string;
  pct: number | null;
  note?: string;
}

export const ProgressPanel = ({ title, detail, pct, note }: ProgressPanelProps) => {
  return (
    <div className="flex w-[min(400px,calc(100vw-32px))] flex-col gap-4 rounded-xl bg-card p-6 shadow-regular">
      <div className="flex items-center gap-3 text-head3">
        <Spinner aria-hidden className="text-primary" />
        {title}
      </div>
      <p
        role="status"
        aria-live="polite"
        className="text-subtitle text-muted-foreground typo-number"
      >
        {detail}
      </p>
      <Progress value={pct} aria-label={title} />
      <Show when={note}>
        <p className="text-body text-faint-foreground">{note}</p>
      </Show>
    </div>
  );
};

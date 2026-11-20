import { Progress as ProgressPrimitive } from '@base-ui/react/progress';

import { cn } from '@/lib/utils';

const Progress = ({ className, ...props }: ProgressPrimitive.Root.Props) => {
  return (
    <ProgressPrimitive.Root data-slot="progress" className={cn('w-full', className)} {...props}>
      <ProgressPrimitive.Track className="relative h-1 w-full overflow-hidden rounded-full bg-accent">
        <ProgressPrimitive.Indicator className="h-full rounded-full bg-primary transition-[width] duration-400 ease-fade data-indeterminate:w-1/3 data-indeterminate:animate-progress-indeterminate" />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
};

export { Progress };

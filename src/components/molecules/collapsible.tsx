import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible';

import { cn } from '@/lib/utils';

const Collapsible = (props: CollapsiblePrimitive.Root.Props) => (
  <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
);

const CollapsibleTrigger = (props: CollapsiblePrimitive.Trigger.Props) => (
  <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
);

const CollapsibleContent = ({
  className,
  children,
  ...props
}: CollapsiblePrimitive.Panel.Props) => (
  <CollapsiblePrimitive.Panel
    data-slot="collapsible-content"
    className="h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-400 ease-spring data-ending-style:h-0 data-ending-style:opacity-0 data-starting-style:h-0 data-starting-style:opacity-0"
    {...props}
  >
    <div className={cn(className)}>{children}</div>
  </CollapsiblePrimitive.Panel>
);

export { Collapsible, CollapsibleContent, CollapsibleTrigger };

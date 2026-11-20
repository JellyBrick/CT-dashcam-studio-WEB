import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';

import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = ({ className, children, ...props }: TabsPrimitive.List.Props) => (
  <TabsPrimitive.List
    className={cn('relative flex rounded-full bg-secondary p-1', className)}
    {...props}
  >
    <TabsPrimitive.Indicator className="absolute top-(--active-tab-top) left-(--active-tab-left) h-(--active-tab-height) w-(--active-tab-width) rounded-full bg-accent transition-[left,width] duration-400 ease-spring" />
    {children}
  </TabsPrimitive.List>
);

const TabsTrigger = ({ className, ...props }: TabsPrimitive.Tab.Props) => (
  <TabsPrimitive.Tab
    className={cn(
      'relative flex h-8 flex-1 items-center justify-center rounded-full px-3 text-body font-semibold text-faint-foreground outline-none transition-colors duration-400 ease-fade hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary data-active:text-foreground',
      className,
    )}
    {...props}
  />
);

const TabsContent = ({ className, ...props }: TabsPrimitive.Panel.Props) => (
  <TabsPrimitive.Panel className={cn('outline-none', className)} {...props} />
);

export { Tabs, TabsContent, TabsList, TabsTrigger };

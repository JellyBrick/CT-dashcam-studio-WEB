import { Show } from '@jellybrick/react-solid-flow';

import type { ReactNode } from 'react';

export const PanelHeader = ({ title, children }: { title: string; children?: ReactNode }) => {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 pt-1 pb-3 group-data-[layout=portrait]/studio:pt-0 group-data-[layout=portrait]/studio:pb-1">
      <h2 className="px-3 text-head1 group-data-[layout=portrait]/studio:text-head2">{title}</h2>
      <Show when={children}>
        <div className="flex items-center pr-2">{children}</div>
      </Show>
    </div>
  );
};

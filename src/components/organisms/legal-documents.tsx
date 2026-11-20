import { For, Match, Switch } from '@jellybrick/react-solid-flow';
import { ChevronDown } from 'lucide-react';

import { Markdown } from '@/components/atoms/markdown';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/molecules/collapsible';
import { WEB_REPO } from '@/lib/links';

import license from '../../../LICENSE?raw';
import audit from '../../../LICENSE_AUDIT.md?raw';
import privacy from '../../../PRIVACY.md?raw';
import dataFlow from '../../../PRIVACY_DATA_FLOW.md?raw';
import thirdParty from '../../../THIRD_PARTY_NOTICES.md?raw';

import type { LegalDoc } from '@/studio/store';

const notices = Object.entries(
  import.meta.glob<string>('../../../licenses/*.txt', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
).map(([file, text]) => ({ name: file.split('/').pop() ?? file, text }));

const LICENSE_SUMMARY = `Original project code is licensed GPL-3.0-only where the owner holds the necessary rights. Third-party code and assets keep their own terms. GPL grants no rights in user footage, third-party artwork or map data, and this software comes without warranty. Some provenance and OpenStreetMap attribution issues remain unresolved; read the license audit before redistributing.

- [Corresponding source (this revision)](${WEB_REPO}/tree/${__SOURCE_REVISION__})
- [Download source ZIP](${WEB_REPO}/archive/${__SOURCE_REVISION__}.zip)`;

const preClass = 'font-mono text-body whitespace-pre-wrap break-words text-muted-foreground';

const LicenseDocument = () => {
  return (
    <div className="flex flex-col gap-4">
      <Markdown source={LICENSE_SUMMARY} />
      <a
        href={`data:text/plain;charset=utf-8,${encodeURIComponent(license)}`}
        download="LICENSE.txt"
        className="w-fit text-subtitle text-attention hover:underline"
      >
        Unmodified GPLv3 text
      </a>
      <pre className={preClass}>{license}</pre>
    </div>
  );
};

const ThirdPartyDocument = () => {
  return (
    <div className="flex flex-col gap-4">
      <Markdown source={thirdParty} />
      <div className="flex flex-col">
        <For each={notices}>
          {({ name, text }) => (
            <Collapsible key={name}>
              <CollapsibleTrigger className="group flex w-full items-center gap-2 py-2 text-left text-subtitle text-muted-foreground transition-colors duration-400 ease-fade hover:text-foreground">
                <span className="min-w-0 flex-1 truncate">{name}</span>
                <ChevronDown className="size-4 shrink-0 transition-transform duration-400 ease-spring group-data-panel-open:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className={`${preClass} pb-4`}>{text}</pre>
              </CollapsibleContent>
            </Collapsible>
          )}
        </For>
      </div>
    </div>
  );
};

export const LegalDocument = ({ doc }: { doc: LegalDoc }) => (
  <Switch>
    <Match when={doc === 'privacy'}>
      <Markdown source={privacy} />
    </Match>
    <Match when={doc === 'license'}>
      <LicenseDocument />
    </Match>
    <Match when={doc === 'third-party'}>
      <ThirdPartyDocument />
    </Match>
    <Match when={doc === 'audit'}>
      <Markdown source={audit} />
    </Match>
    <Match when={doc === 'data-flow'}>
      <Markdown source={dataFlow} />
    </Match>
  </Switch>
);

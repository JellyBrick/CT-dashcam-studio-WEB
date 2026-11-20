import { Show } from '@jellybrick/react-solid-flow';
import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Reveal } from '@/components/atoms/reveal';
import { Swap } from '@/components/atoms/swap';

import { ClipSearchContext, useClipSearch } from './clip-search-context';

import type { ReactNode } from 'react';

export const ClipSearchProvider = ({ children }: { children: ReactNode }) => {
  const [query, setQuery] = useState('');
  const [open, setOpenState] = useState(false);
  const setOpen = (next: boolean) => {
    setOpenState(next);
    if (!next) setQuery('');
  };
  return (
    <ClipSearchContext value={{ query, open, setQuery, setOpen }}>{children}</ClipSearchContext>
  );
};

export const ClipSearchToggle = () => {
  const { t } = useTranslation();
  const { open, setOpen } = useClipSearch();
  return (
    <Button
      variant="quiet"
      size="icon"
      aria-label={t(open ? 'search_close' : 'search_open')}
      aria-expanded={open}
      onClick={() => setOpen(!open)}
    >
      <Swap id={open ? 'close' : 'open'} variant="scale" className="flex">
        <Show when={open} fallback={<Search />}>
          <X />
        </Show>
      </Swap>
    </Button>
  );
};

export const ClipSearchField = () => {
  const { t } = useTranslation();
  const { open, query, setQuery, setOpen } = useClipSearch();
  return (
    <Reveal show={open} className="px-2 pb-3">
      <Input
        ref={(input) => input?.focus()}
        value={query}
        enterKeyHint="search"
        placeholder={t('search_placeholder')}
        aria-label={t('search_open')}
        icon={<Search />}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
        }}
        end={
          <Show when={query}>
            <Button
              variant="quiet"
              size="icon-xs"
              aria-label={t('search_clear')}
              onClick={() => setQuery('')}
              className="size-6 animate-in duration-200 fade-in-0 zoom-in-90"
            >
              <X />
            </Button>
          </Show>
        }
      />
    </Reveal>
  );
};

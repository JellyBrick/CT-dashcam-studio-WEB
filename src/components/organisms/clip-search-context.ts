import { createContext, use } from 'react';

export interface ClipSearch {
  query: string;
  open: boolean;
  setQuery: (query: string) => void;
  setOpen: (open: boolean) => void;
}

export const ClipSearchContext = createContext<ClipSearch | null>(null);

export const useClipSearch = () => {
  const search = use(ClipSearchContext);
  if (!search) throw new Error('useClipSearch must be used inside ClipSearchProvider');
  return search;
};

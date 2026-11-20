import { useStudio } from '@/studio/store';

export const useLayoutMode = () => useStudio((state) => state.layoutMode);

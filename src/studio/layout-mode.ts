import { throttle } from 'es-toolkit';

import { isMobileDevice } from '@/lib/platform';

import { getStudio, type LayoutMode, setStudio, useStudio, type ViewMode } from './store';

const computeLayoutMode = (viewMode: ViewMode): LayoutMode => {
  const mobile = viewMode === 'auto' ? isMobileDevice() : viewMode === 'mobile';
  if (!mobile) return 'desktop';
  return window.innerWidth > window.innerHeight && window.innerHeight <= 600
    ? 'landscape'
    : 'portrait';
};

export const watchLayoutMode = () => {
  const update = () => setStudio({ layoutMode: computeLayoutMode(getStudio().viewMode) });
  const onResize = throttle(update, 100);
  const onOrientation = () => setTimeout(update, 150);
  update();
  const unsubscribe = useStudio.subscribe((state, previous) => {
    if (state.viewMode !== previous.viewMode) update();
  });
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onOrientation);
  return () => {
    unsubscribe();
    onResize.cancel();
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onOrientation);
  };
};

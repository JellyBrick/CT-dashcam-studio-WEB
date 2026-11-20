import { AnimatePresence, m } from 'motion/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { ProgressPanel } from '@/components/molecules/progress-panel';
import { isIOS } from '@/lib/platform';
import { useStudio } from '@/studio/store';

const blockKeys = (event: KeyboardEvent) => {
  event.preventDefault();
  event.stopImmediatePropagation();
};

const blockScroll = (event: Event) => event.preventDefault();

export const LoadProgressOverlay = () => {
  const { t } = useTranslation();
  const progress = useStudio((state) => state.loadProgress);
  const visible = progress !== null;

  useEffect(() => {
    if (!visible) return;
    window.addEventListener('keydown', blockKeys, true);
    window.addEventListener('touchmove', blockScroll, { passive: false });
    window.addEventListener('wheel', blockScroll, { passive: false });
    return () => {
      window.removeEventListener('keydown', blockKeys, true);
      window.removeEventListener('touchmove', blockScroll);
      window.removeEventListener('wheel', blockScroll);
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {progress && (
        <m.div
          key="load-progress"
          className="fixed inset-0 z-50 flex items-center justify-center bg-glass backdrop-blur-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.55, 0.15, 0.25, 0.95] }}
        >
          <ProgressPanel
            title={t(progress.titleKey)}
            detail={t(progress.countKey, progress.params)}
            pct={progress.indeterminate ? null : progress.pct}
            note={isIOS() ? t('progress_ios_usb_note') : undefined}
          />
        </m.div>
      )}
    </AnimatePresence>
  );
};

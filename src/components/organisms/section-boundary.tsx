import { ErrorBoundary } from '@jellybrick/react-solid-flow';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/atoms/button';

import type { ReactNode } from 'react';

export const SectionBoundary = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  return (
    <ErrorBoundary
      onCatch={(error) => console.error(error)}
      fallback={(_, reset) => (
        <div className="flex flex-col items-start gap-3 p-4 text-subtitle text-muted-foreground">
          {t('section_failed')}
          <Button variant="solid" size="sm" onClick={reset}>
            {t('btn_retry')}
          </Button>
        </div>
      )}
    >
      <Suspense>{children}</Suspense>
    </ErrorBoundary>
  );
};

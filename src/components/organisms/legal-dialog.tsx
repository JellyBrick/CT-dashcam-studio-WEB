import { For } from '@jellybrick/react-solid-flow';
import { lazy } from 'react';
import { useTranslation } from 'react-i18next';

import { ScrollArea } from '@/components/atoms/scroll-area';
import { Swap } from '@/components/atoms/swap';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/molecules/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/molecules/tabs';
import { LEGAL_DOCS, type LegalDoc, openDialog, openLegal, useStudio } from '@/studio/store';

import { SectionBoundary } from './section-boundary';

import type { TranslationKey } from '@/i18n';

const LegalDocument = lazy(() =>
  import('./legal-documents').then(({ LegalDocument }) => ({ default: LegalDocument })),
);

const TAB_LABELS: Record<LegalDoc, TranslationKey> = {
  'privacy': 'privacy_policy',
  'license': 'privacy_licenses',
  'third-party': 'privacy_third_party',
  'audit': 'privacy_audit',
  'data-flow': 'privacy_data_flow',
};

export const LegalDialog = () => {
  const { t } = useTranslation();
  const open = useStudio((state) => state.dialog === 'legal');
  const doc = useStudio((state) => state.legalDoc);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && openDialog(null)}>
      <DialogContent
        closeLabel={t('privacy_close')}
        autoHeight={false}
        className="h-[calc(100dvh-2rem)] max-w-3xl overflow-hidden"
        bodyClassName="h-full gap-4"
      >
        <DialogHeader>
          <DialogTitle>{t('privacy_preferences')}</DialogTitle>
          <DialogDescription className="text-body">{t('privacy_canonical')}</DialogDescription>
        </DialogHeader>
        <Tabs
          value={doc}
          onValueChange={(value: LegalDoc) => openLegal(value)}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <TabsList className="shrink-0 overflow-x-auto">
            <For each={LEGAL_DOCS}>
              {(value) => (
                <TabsTrigger key={value} value={value} className="flex-none">
                  {t(TAB_LABELS[value])}
                </TabsTrigger>
              )}
            </For>
          </TabsList>
          <TabsContent value={doc} render={<ScrollArea className="flex-1" />}>
            <Swap id={doc}>
              <SectionBoundary>
                <article lang="en" className="pr-3 pb-6">
                  <LegalDocument doc={doc} />
                </article>
              </SectionBoundary>
            </Swap>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

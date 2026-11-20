import { Show } from '@jellybrick/react-solid-flow';
import { ChevronDown } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/atoms/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/molecules/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/molecules/dialog';
import { chooseConsent, consent } from '@/studio/consent';
import { setStudio, useStudio } from '@/studio/store';

import { LegalLinks } from './legal-links';

export const ConsentNotice = () => {
  const { t } = useTranslation();
  const open = useStudio((state) => state.consentOpen);
  const choice = useSyncExternalStore(consent.subscribe, () => consent.choice);
  const persistent = useSyncExternalStore(consent.subscribe, () => consent.persistent);
  const status = choice
    ? `${t(`privacy_${choice}`)}${persistent ? '' : ` ${t('privacy_storage')}`}`
    : '';

  return (
    <Dialog
      open={open}
      modal={false}
      disablePointerDismissal
      onOpenChange={(next) => setStudio({ consentOpen: next })}
    >
      <DialogContent
        placement="corner"
        closeLabel={t('privacy_close')}
        initialFocus={choice !== null}
      >
        <DialogHeader>
          <DialogTitle className="text-head3">
            {choice ? t('privacy_settings') : t('privacy_analytics')}
          </DialogTitle>
          <DialogDescription className="text-body">{t('privacy_body')}</DialogDescription>
        </DialogHeader>
        <Collapsible>
          <CollapsibleTrigger className="group flex items-center gap-1 text-body text-muted-foreground transition-colors duration-400 ease-fade hover:text-foreground">
            {t('privacy_map')}
            <ChevronDown className="size-3.5 transition-transform duration-400 ease-spring group-data-panel-open:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 text-body text-muted-foreground">
            {t('privacy_map_body')}
          </CollapsibleContent>
        </Collapsible>
        <Show when={status}>
          <p role="status" className="text-body text-attention">
            {status}
          </p>
        </Show>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="tonal" onClick={() => chooseConsent('granted')}>
            {t('privacy_accept')}
          </Button>
          <Button variant="tonal" onClick={() => chooseConsent('denied')}>
            {t('privacy_reject')}
          </Button>
        </div>
        <LegalLinks withSettings={false} />
      </DialogContent>
    </Dialog>
  );
};

import { useTranslation } from 'react-i18next';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/molecules/dialog';
import { openDialog, useStudio } from '@/studio/store';

import { TierBadge, TierDetails } from './tier-details';

export const TierDialog = () => {
  const { t } = useTranslation();
  const open = useStudio((state) => state.dialog === 'tier');
  return (
    <Dialog open={open} onOpenChange={(next) => !next && openDialog(null)}>
      <DialogContent closeLabel={t('btn_close')}>
        <DialogHeader className="flex-row items-center gap-3">
          <DialogTitle>{t('tier_title')}</DialogTitle>
          <TierBadge />
        </DialogHeader>
        <TierDetails />
      </DialogContent>
    </Dialog>
  );
};

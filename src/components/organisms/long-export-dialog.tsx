import { useTranslation } from 'react-i18next';

import { Button } from '@/components/atoms/button';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogTitle,
} from '@/components/molecules/alert-dialog';
import { DialogFooter } from '@/components/molecules/dialog';
import { startExport } from '@/studio/export';
import { setStudio, useStudio } from '@/studio/store';

export const LongExportDialog = () => {
  const { t } = useTranslation();
  const open = useStudio((state) => state.confirmLongExport);
  return (
    <AlertDialog open={open} onOpenChange={(next) => setStudio({ confirmLongExport: next })}>
      <AlertDialogContent>
        <AlertDialogTitle className="text-head3">{t('confirm_mobile_long_clip')}</AlertDialogTitle>
        <DialogFooter>
          <AlertDialogClose render={<Button variant="tonal" />}>{t('btn_cancel')}</AlertDialogClose>
          <Button
            onClick={() => {
              setStudio({ confirmLongExport: false });
              startExport({ confirmed: true }).catch(reportError);
            }}
          >
            {t('btn_continue')}
          </Button>
        </DialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

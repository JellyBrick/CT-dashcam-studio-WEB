import { useTranslation } from 'react-i18next';

import { Button } from '@/components/atoms/button';
import { Progress } from '@/components/atoms/progress';
import { Spinner } from '@/components/atoms/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/molecules/dialog';
import { cancelExport } from '@/studio/export';
import { useStudio } from '@/studio/store';

export const ExportProgressDialog = () => {
  const { t } = useTranslation();
  const progress = useStudio((state) => state.exportProgress);
  if (!progress) return null;
  const { pct, segment, totalSegments, targetFps, speed, cancelling } = progress;
  const info = cancelling
    ? t('export_modal_cancelling')
    : pct === 0
      ? t('export_modal_fps_prep', { 0: targetFps, 1: speed })
      : t('export_modal_fps_info', { 0: pct, 1: targetFps, 2: speed });

  return (
    <Dialog open disablePointerDismissal onOpenChange={() => {}}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {t('export_modal_title')}
            <Spinner aria-hidden className="text-primary" />
          </DialogTitle>
          <DialogDescription className="typo-number">
            {t('export_modal_file_tag', { 0: segment, 1: totalSegments })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-head1 typo-number">{pct}%</span>
            <span className="truncate text-body text-muted-foreground">{info}</span>
          </div>
          <Progress value={pct} aria-label={t('export_modal_title')} />
        </div>
        <p className="text-body text-muted-foreground">
          <strong className="font-semibold text-foreground">{t('export_warn_title')}</strong>{' '}
          {t('export_warn_body')}
        </p>
        <DialogFooter>
          <Button variant="tonal" disabled={cancelling} onClick={cancelExport}>
            {cancelling ? t('status_cancelling') : t('btn_export_cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

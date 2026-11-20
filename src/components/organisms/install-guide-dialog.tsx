import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BrandLogo } from '@/components/atoms/brand-logo';
import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/molecules/dialog';
import { isAndroid, isIOS } from '@/lib/platform';
import { promptInstall, usePwa } from '@/studio/pwa';
import { openDialog, useStudio } from '@/studio/store';

const platformGuide = () => (isIOS() ? 'ios' : isAndroid() ? 'android' : 'desktop');

export const InstallGuideDialog = () => {
  const { t } = useTranslation();
  const open = useStudio((state) => state.dialog === 'install');
  const canPrompt = usePwa((state) => state.prompt !== null);
  const [copyStatus, setCopyStatus] = useState('');
  const platform = platformGuide();
  const close = () => openDialog(null);

  const copyLink = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setCopyStatus(t('install_copy_success'));
        setTimeout(() => setCopyStatus(''), 3000);
      })
      .catch(() => setCopyStatus(window.location.href));
  };

  const install = () => {
    promptInstall()
      .then((accepted) => {
        if (accepted) close();
      })
      .catch((error: unknown) => console.warn('[PWA] Prompt error:', error));
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent closeLabel={t('btn_close')}>
        <DialogHeader className="flex-row items-center gap-4">
          <BrandLogo className="size-12" />
          <div className="flex flex-col gap-1">
            <DialogTitle>{t('install_guide_title')}</DialogTitle>
            <DialogDescription>{t('install_preview_sub')}</DialogDescription>
          </div>
        </DialogHeader>
        <section className="flex flex-col gap-3">
          <h3 className="text-title">{t(`install_title_${platform}`)}</h3>
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-subtitle text-muted-foreground marker:text-faint-foreground">
            {([1, 2, 3] as const).map((step) => (
              <li key={step}>{t(`install_step_${platform}_${step}`)}</li>
            ))}
          </ol>
        </section>
        <DialogFooter className="items-center justify-between">
          <span role="status" className="min-w-0 truncate text-body text-attention">
            {copyStatus}
          </span>
          <div className="flex gap-2">
            <Button variant="solid" onClick={copyLink}>
              {t('install_btn_copy')}
            </Button>
            {platform !== 'ios' && canPrompt && (
              <Button onClick={install}>{t('install_btn_pwa')}</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import { useTranslation } from 'react-i18next';

import { Button } from '@/components/atoms/button';
import { setViewMode } from '@/studio/store';

export const ViewModeFab = () => {
  const { t } = useTranslation();
  return (
    <Button
      size="lg"
      className="fixed right-6 bottom-6 z-40 shadow-regular"
      onClick={() => setViewMode('mobile')}
    >
      {t('btn_switch_mobile')}
    </Button>
  );
};

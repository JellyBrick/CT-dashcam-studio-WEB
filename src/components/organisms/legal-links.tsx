import { Show } from '@jellybrick/react-solid-flow';
import { useTranslation } from 'react-i18next';

import { openLegal, setStudio } from '@/studio/store';

const linkClass =
  'text-left text-body text-muted-foreground transition-colors duration-400 ease-fade hover:text-foreground';

export const LegalLinks = ({ withSettings = true }: { withSettings?: boolean }) => {
  const { t } = useTranslation();
  return (
    <nav className="flex flex-wrap gap-x-4 gap-y-2">
      <Show when={withSettings}>
        <button
          type="button"
          className={linkClass}
          onClick={() => setStudio({ consentOpen: true })}
        >
          {`${t('privacy_preferences')} · GPL-3.0-only`}
        </button>
      </Show>
      <button type="button" className={linkClass} onClick={() => openLegal('privacy')}>
        {t('privacy_policy')}
      </button>
      <button type="button" className={linkClass} onClick={() => openLegal('license')}>
        {`${t('privacy_licenses')} · GPL-3.0-only`}
      </button>
      <button type="button" className={linkClass} onClick={() => openLegal('third-party')}>
        {t('privacy_third_party')}
      </button>
    </nav>
  );
};

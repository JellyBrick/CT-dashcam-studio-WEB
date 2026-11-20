import { type ConsentChoice, createAnalyticsConsent } from '@/lib/consent';

import { setStudio } from './store';

const localStorageOrNull = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const consent = createAnalyticsConsent({
  win: window,
  doc: document,
  storage: localStorageOrNull(),
  measurementId: 'G-E05V74Q9Q7',
  environment: import.meta.env.BASE_URL.includes('/dev/') ? 'development' : 'production',
});

if (consent.choice === null) setStudio({ consentOpen: true });
consent.subscribe(({ choice }) => {
  if (choice === null) setStudio({ consentOpen: true });
});

export const chooseConsent = (choice: ConsentChoice) => {
  consent.setChoice(choice);
  if (consent.persistent) setStudio({ consentOpen: false });
};

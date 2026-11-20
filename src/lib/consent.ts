import { compact } from 'es-toolkit';
import * as z from 'zod/mini';

const ConsentChoiceSchema = z.enum(['granted', 'denied']);
export type ConsentChoice = z.infer<typeof ConsentChoiceSchema>;

export const CONSENT_KEY = 'ct_analytics_consent';
const CONSENT_VERSION = 1;
const ConsentRecordSchema = z.object({
  v: z.literal(CONSENT_VERSION),
  analytics: ConsentChoiceSchema,
});

const deniedSignals = {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [disableFlag: `ga-disable-${string}`]: boolean | undefined;
  }
}

type ConsentWindow = Pick<Window, 'location' | 'addEventListener' | 'dataLayer' | 'gtag'> & {
  [disableFlag: `ga-disable-${string}`]: boolean | undefined;
};

type ConsentDocument = Pick<
  Document,
  'cookie' | 'referrer' | 'visibilityState' | 'addEventListener' | 'createElement' | 'head'
>;

interface ConsentOptions {
  win: ConsentWindow;
  doc: ConsentDocument;
  storage: Pick<Storage, 'getItem' | 'setItem'> | null;
  measurementId?: string;
  environment?: string;
}

export interface ConsentState {
  choice: ConsentChoice | null;
  persistent: boolean;
}

export const parseConsent = (value: string | null | undefined): ConsentChoice | null => {
  try {
    return ConsentRecordSchema.safeParse(JSON.parse(value ?? '')).data?.analytics ?? null;
  } catch {
    return null;
  }
};

const safeReferrer = (value: string) => {
  try {
    const url = new URL(value);
    return url.origin + url.pathname;
  } catch {
    return '';
  }
};

const deleteAnalyticsCookies = (win: ConsentWindow, doc: ConsentDocument) => {
  let names: string[];
  try {
    names = doc.cookie
      .split(';')
      .map((part) => part.trim().split('=')[0] ?? '')
      .filter((name) => /^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(name));
  } catch {
    return;
  }
  const labels = win.location.hostname.split('.');
  const domains = [
    '',
    ...labels.map((_, i) => labels.slice(i).join('.')).filter((domain) => domain.includes('.')),
  ];
  const segments = compact(win.location.pathname.split('/'));
  const paths = ['/', ...segments.map((_, i) => `/${segments.slice(0, i + 1).join('/')}`)];
  for (const name of names)
    for (const domain of domains)
      for (const path of paths) {
        try {
          doc.cookie = `${name}=; Max-Age=0; path=${path};${domain ? ` domain=${domain};` : ''} SameSite=Lax`;
        } catch {
          continue;
        }
      }
};

export const createAnalyticsConsent = ({
  win,
  doc,
  storage,
  measurementId = '',
  environment = 'production',
}: ConsentOptions) => {
  let choice: ConsentChoice | null = null;
  let persistent = true;
  let initialized = false;
  const listeners = new Set<(state: ConsentState) => void>();
  const dataLayer = (win.dataLayer ??= []);
  const disableFlag = `ga-disable-${measurementId}` as const;

  // gtag.js only reads Arguments objects from the dataLayer, not arrays.
  const queue: (...args: unknown[]) => void = function () {
    dataLayer.push(arguments);
  };

  const read = () => {
    try {
      return parseConsent(storage?.getItem(CONSENT_KEY));
    } catch {
      return null;
    }
  };

  if (measurementId) {
    win[disableFlag] = true;
    queue('consent', 'default', { ...deniedSignals });
    queue('set', 'ads_data_redaction', true);
    win.gtag = (...args) => {
      if (choice === 'granted') queue(...args);
    };
  }

  const apply = (next: ConsentChoice | null) => {
    const previous = choice;
    choice = next;
    if (measurementId) {
      win[disableFlag] = choice !== 'granted';
      if (choice === 'granted') {
        if (previous !== 'granted')
          queue('consent', 'update', { ...deniedSignals, analytics_storage: 'granted' });
        if (!initialized) {
          initialized = true;
          queue('js', new Date());
          queue('config', measurementId, {
            allow_google_signals: false,
            allow_ad_personalization_signals: false,
            page_location: win.location.origin + win.location.pathname,
            page_referrer: safeReferrer(doc.referrer),
            deployment_environment: environment,
          });
          const tag = doc.createElement('script');
          tag.async = true;
          tag.dataset.ctAnalytics = 'true';
          tag.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
          doc.head.appendChild(tag);
        }
      } else if (initialized && previous === 'granted') {
        queue('consent', 'update', { ...deniedSignals });
      }
    }
    if (choice !== 'granted') deleteAnalyticsCookies(win, doc);
    for (const listener of listeners) listener({ choice, persistent });
  };

  win.addEventListener('storage', (event) => {
    if (event.key === CONSENT_KEY || event.key === null) apply(read());
  });
  win.addEventListener('pageshow', () => {
    if (persistent) apply(read());
  });
  doc.addEventListener('visibilitychange', () => {
    if (persistent && doc.visibilityState === 'visible') apply(read());
  });
  apply(read());

  return {
    get choice() {
      return choice;
    },
    get persistent() {
      return persistent;
    },
    setChoice(next: ConsentChoice) {
      if (!ConsentChoiceSchema.safeParse(next).success) throw new Error('Invalid analytics choice');
      try {
        storage?.setItem(CONSENT_KEY, JSON.stringify({ v: CONSENT_VERSION, analytics: next }));
        persistent = Boolean(storage);
      } catch {
        persistent = false;
      }
      apply(next);
    },
    subscribe: (listener: (state: ConsentState) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

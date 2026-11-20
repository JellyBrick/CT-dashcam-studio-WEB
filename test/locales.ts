import type { SupportedLang } from '../src/i18n';

const files = import.meta.glob<Record<string, string>>('../src/i18n/locales/*.json', {
  eager: true,
  import: 'default',
});

export const TRANSLATIONS = Object.fromEntries(
  Object.entries(files).map(([path, strings]) => [path.replace(/^.*\/|\.json$/g, ''), strings]),
) as Record<SupportedLang, Record<string, string>>;

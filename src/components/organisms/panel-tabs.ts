import { Download, Film, Layers, Settings } from 'lucide-react';

import type { TranslationKey } from '@/i18n';
import type { PanelTab } from '@/studio/store';
import type { LucideIcon } from 'lucide-react';

export const PANEL_TABS: { tab: PanelTab; icon: LucideIcon; labelKey: TranslationKey }[] = [
  { tab: 'clips', icon: Film, labelKey: 'drawer_clips' },
  { tab: 'overlays', icon: Layers, labelKey: 'drawer_overlays' },
  { tab: 'export', icon: Download, labelKey: 'tab_export' },
  { tab: 'settings', icon: Settings, labelKey: 'tab_settings' },
];

export const plainLabel = (text: string) =>
  text
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/\s*[:：]\s*$/u, '')
    .trim();

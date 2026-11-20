import { Show } from '@jellybrick/react-solid-flow';
import { lazy } from 'react';

import { ClipsPanel } from '@/components/organisms/clips-panel';
import { ConsentNotice } from '@/components/organisms/consent-notice';
import { ExportProgressDialog } from '@/components/organisms/export-progress-dialog';
import { HiddenVideoPool } from '@/components/organisms/hidden-video-pool';
import { HotkeyDialog } from '@/components/organisms/hotkey-dialog';
import { InstallGuideDialog } from '@/components/organisms/install-guide-dialog';
import { LandscapeDrawer } from '@/components/organisms/landscape-drawer';
import { LegalDialog } from '@/components/organisms/legal-dialog';
import { LoadProgressOverlay } from '@/components/organisms/load-progress-overlay';
import { LongExportDialog } from '@/components/organisms/long-export-dialog';
import { MobileTabBar } from '@/components/organisms/mobile-tab-bar';
import { NavRail } from '@/components/organisms/nav-rail';
import { PlayerHeader } from '@/components/organisms/player-header';
import { PlayerViewport } from '@/components/organisms/player-viewport';
import { SectionBoundary } from '@/components/organisms/section-boundary';
import { TierDialog } from '@/components/organisms/tier-dialog';
import { TimelineDeck } from '@/components/organisms/timeline-deck';
import { TutorialDialog } from '@/components/organisms/tutorial-dialog';
import { ViewModeFab } from '@/components/organisms/view-mode-fab';
import { StudioLayout } from '@/components/templates/studio-layout';
import { useLayoutMode } from '@/hooks/use-layout-mode';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { isMobileDevice } from '@/lib/platform';
import { useStudio } from '@/studio/store';

const OverlaysPanel = lazy(() =>
  import('@/components/organisms/overlays-panel').then((module) => ({
    default: module.OverlaysPanel,
  })),
);
const ExportPanel = lazy(() =>
  import('@/components/organisms/export-panel').then((module) => ({
    default: module.ExportPanel,
  })),
);
const SettingsPanel = lazy(() =>
  import('@/components/organisms/settings-panel').then((module) => ({
    default: module.SettingsPanel,
  })),
);

export const StudioPage = () => {
  const mode = useLayoutMode();
  const panelTab = useStudio((state) => state.panelTab);
  const desktop = mode === 'desktop';
  useShortcuts();

  const panels = {
    clips: <ClipsPanel />,
    overlays: (
      <SectionBoundary>
        <OverlaysPanel />
      </SectionBoundary>
    ),
    export: (
      <SectionBoundary>
        <ExportPanel />
      </SectionBoundary>
    ),
    settings: (
      <SectionBoundary>
        <SettingsPanel />
      </SectionBoundary>
    ),
  };

  return (
    <>
      <StudioLayout
        mode={mode}
        rail={<NavRail />}
        header={<PlayerHeader />}
        viewport={<PlayerViewport className={desktop ? 'flex-1 rounded-lg' : 'flex-1'} />}
        deck={<TimelineDeck />}
        panelId={panelTab}
        panel={panels[panelTab]}
        tabBar={<MobileTabBar />}
        drawer={<LandscapeDrawer panels={panels} />}
      />
      <Show when={desktop && isMobileDevice()}>
        <ViewModeFab />
      </Show>
      <HiddenVideoPool />
      <LoadProgressOverlay />
      <ExportProgressDialog />
      <LongExportDialog />
      <HotkeyDialog />
      <TierDialog />
      <InstallGuideDialog />
      <TutorialDialog />
      <ConsentNotice />
      <LegalDialog />
    </>
  );
};

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { domMax, LazyMotion, MotionConfig } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/index.css';
import { Toaster } from '@/components/molecules/sonner';
import { TooltipProvider } from '@/components/molecules/tooltip';
import { StudioPage } from '@/components/pages/studio-page';
import { watchLayoutMode } from '@/studio/layout-mode';
import { watchMotion } from '@/studio/motion';

const root = document.getElementById('app');
if (root) {
  watchLayoutMode();
  watchMotion();
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={new QueryClient()}>
        <LazyMotion features={domMax} strict>
          <MotionConfig reducedMotion="user">
            <TooltipProvider>
              <StudioPage />
            </TooltipProvider>
          </MotionConfig>
        </LazyMotion>
        <Toaster position="top-center" />
      </QueryClientProvider>
    </StrictMode>,
  );
}

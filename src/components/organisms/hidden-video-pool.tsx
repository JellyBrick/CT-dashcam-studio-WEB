import { mountVideoPool } from '@/studio/playback';

export const HiddenVideoPool = () => {
  return (
    <div
      id="hidden-video-container"
      ref={mountVideoPool}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 size-4 overflow-hidden opacity-[0.01]"
    />
  );
};

export const isAppWindow = (
  match: (query: string) => { matches: boolean } = window.matchMedia.bind(window),
  iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true,
): boolean => {
  return (
    iosStandalone ||
    ['standalone', 'minimal-ui', 'window-controls-overlay'].some(
      (mode) => match(`(display-mode: ${mode})`).matches,
    )
  );
};

export const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent || '') ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
};

export const isAndroid = (): boolean => {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');
};

export const isIOSOrAndroid = () => isIOS() || isAndroid();

export const isMobileDevice = (): boolean => {
  const isMobileUa = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || '',
  );
  const isSmallScreen = window.innerWidth <= 850;
  const isMobileLandscape = window.innerHeight <= 600 && window.innerWidth > window.innerHeight;
  return isMobileUa || isSmallScreen || isMobileLandscape;
};

export const isDevDeployment = () =>
  window.location.pathname.includes('/dev/') || import.meta.env.BASE_URL.includes('/dev/');

export const assetUrl = (file: string) => `${import.meta.env.BASE_URL}${file}`;

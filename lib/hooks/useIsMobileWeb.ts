import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

function detectMobileWeb() {
  if (Platform.OS !== 'web') {
    return false;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isMobileUa = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const hasCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const isNarrowViewport = window.innerWidth < 860;

  return isMobileUa || (hasCoarsePointer && isNarrowViewport);
}

export function useIsMobileWeb() {
  const [isMobileWeb, setIsMobileWeb] = useState(() => detectMobileWeb());

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const handleResize = () => {
      setIsMobileWeb(detectMobileWeb());
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return useMemo(() => Platform.OS === 'web' && isMobileWeb, [isMobileWeb]);
}

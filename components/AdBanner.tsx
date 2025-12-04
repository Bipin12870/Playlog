import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

declare global {
  interface Window {
    adsbygoogle?: { push: (arg: any) => void }[];
  }
}

type AdBannerProps = {
  slot: string;
  format?: string;
  fullWidthResponsive?: 'true' | 'false';
};

export function AdBanner({
  slot,
  format = 'auto',
  fullWidthResponsive = 'true',
}: AdBannerProps) {
  const adRef = useRef<HTMLDivElement | null>(null);

  if (Platform.OS !== 'web') return null;

  useEffect(() => {
    if (!adRef.current) return;

    try {
      adRef.current.innerHTML = '';

      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.setAttribute('data-ad-client', 'ca-pub-4080796055621452');
      ins.setAttribute('data-ad-slot', slot);
      ins.setAttribute('data-ad-format', format);
      ins.setAttribute('data-full-width-responsive', fullWidthResponsive);

      adRef.current.appendChild(ins);

      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.warn('AdSense error:', error);
    }
  }, [slot, format, fullWidthResponsive]);

  return <View style={styles.container} ref={adRef as any} />;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

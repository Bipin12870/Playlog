import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';

import { db } from '../firebase';

export type AffiliateOverride = {
  id: string;
  url: string;
  label?: string | null;
  imageUrl?: string | null;
};

export function useAffiliateOverrides() {
  const [overrides, setOverrides] = useState<Record<string, AffiliateOverride>>({});

  useEffect(() => {
    const ref = collection(db, 'affiliateItems');
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const map: Record<string, AffiliateOverride> = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (typeof data.id === 'string' && typeof data.url === 'string') {
            const imageUrl =
              typeof data.imageUrl === 'string' && data.imageUrl.trim().length > 0
                ? data.imageUrl
                : null;
            map[data.id] = {
              id: data.id,
              url: data.url,
              label: typeof data.label === 'string' ? data.label : null,
              imageUrl,
            };
          }
        });
        console.log('[AFF OVERRIDES STREAM]', map);
        setOverrides(map);
      },
      (err) => {
        console.error('Failed to load affiliate overrides', err);
      },
    );
    return unsubscribe;
  }, []);

  return overrides;
}

import { collection, doc, getDocs, setDoc } from 'firebase/firestore';

import { db } from './firebase';

export async function seedAffiliateDefaults() {
  const ref = collection(db, 'affiliateItems');
  const snapshot = await getDocs(ref);
  if (!snapshot.empty) {
    console.log('[AFF SEED] Skipped — existing data found.');
    return;
  }

  console.log('[AFF SEED] Seeding default affiliateItems...');

  const defaults = [
    {
      id: 'ps5Console',
      label: 'Buy a PS5 console',
      url: 'https://example.com/ps5',
      imageUrl: 'https://example.com/ps5.png',
    },
    {
      id: 'gamingMouse',
      label: 'Buy a gaming mouse',
      url: 'https://example.com/mouse',
      imageUrl: 'https://example.com/mouse.png',
    },
  ];

  await Promise.all(
    defaults.map((item) =>
      setDoc(
        doc(ref, item.id),
        {
          id: item.id,
          url: item.url,
          label: item.label,
          imageUrl: item.imageUrl,
        },
        { merge: true },
      ),
    ),
  );

  console.log('[AFF SEED] Completed.');
}

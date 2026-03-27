import { useEffect, useState } from 'react';
import { subscribeToAssets } from '../lib/firestore';
import type { Asset } from '../lib/types';

export function useAssets(userId: string | undefined) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setAssets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeToAssets(userId, (data) => {
      setAssets(data);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  return { assets, loading };
}

import { useEffect, useState } from 'react';
import { subscribeToSnapshots } from '../lib/firestore';
import type { BalanceSnapshot } from '../lib/types';

export function useSnapshots(userId: string | undefined) {
  const [snapshots, setSnapshots] = useState<BalanceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setSnapshots([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeToSnapshots(userId, (data) => {
      setSnapshots(data);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  return { snapshots, loading };
}

import { useEffect, useState } from 'react';
import { subscribeToExpenses } from '../lib/firestore';
import type { Expense } from '../lib/types';

export function useExpenses(userId: string | undefined) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setExpenses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeToExpenses(userId, (data) => {
      setExpenses(data);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  return { expenses, loading };
}

import { useEffect, useState } from 'react';
import { getRates } from '../lib/frankfurter';

export function useCurrencyRates() {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await getRates();
      setRates(data);
      setError(null);
    } catch {
      setError('Could not refresh exchange rates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { rates, loading, error, refresh };
}

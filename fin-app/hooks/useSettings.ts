import { useEffect, useState } from 'react';
import { subscribeToSettings, saveSettings } from '../lib/firestore';
import type { UserSettings } from '../lib/types';

export function useSettings(userId: string | undefined) {
  const [settings, setSettings] = useState<UserSettings>({ defaultCurrency: 'PLN', language: 'en' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const unsub = subscribeToSettings(userId, (data) => {
      setSettings(data);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!userId) return;
    const next = { ...settings, ...updates };
    setSettings(next);
    await saveSettings(userId, next);
  };

  return { settings, loading, updateSettings };
}

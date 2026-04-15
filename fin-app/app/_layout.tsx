import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/theme';
import { setPendingAutoSave } from '../lib/notificationState';

export default function RootLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // TODO: auth disabled for testing
  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(tabs)';
    if (!inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [loading, segments]);

  // Handle notification tap → navigate to history and trigger auto-save
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      setPendingAutoSave();
      router.push('/history' as never);
    });
    return () => sub.remove();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

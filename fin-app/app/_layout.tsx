import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/theme';

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

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

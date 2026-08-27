import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React from 'react';

import '@/global.css';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { usePreferencesStore } from '@/stores/preferences-store';

export default function RootLayout() {
  const colorScheme = useResolvedColorScheme();
  const preferencesHydrated = usePreferencesStore((state) => state.hasHydrated);

  if (!preferencesHydrated) {
    return <AnimatedSplashOverlay />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack
        screenOptions={{
          animation: 'simple_push',
          headerShown: false,
        }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen name="assets/pots" />
        <Stack.Screen name="assets/pots/new" />
        <Stack.Screen name="assets/pots/[id]" />
        <Stack.Screen name="assets/pots/[id]/edit" />
        <Stack.Screen name="assets/media" />
        <Stack.Screen name="assets/fertilizers" />
        <Stack.Screen name="assets/pesticides" />
        <Stack.Screen name="plants/[id]/care" />
        <Stack.Screen name="plants/[id]/v2" />
      </Stack>
    </ThemeProvider>
  );
}

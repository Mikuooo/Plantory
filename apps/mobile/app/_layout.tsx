import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React from 'react';

import '@/global.css';

import { AppErrorScreen } from '@/components/app-error-screen';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { appStackRoutes } from '@/components/navigation-config';
import { usePreferencesHydrated } from '@/hooks/use-preferences';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { initializeObservability, withObservability } from '@/observability/sentry';

initializeObservability();

export const ErrorBoundary = AppErrorScreen;

function RootLayout() {
  const colorScheme = useResolvedColorScheme();
  const preferencesHydrated = usePreferencesHydrated();

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
        {appStackRoutes.map(({ name, animation }) => (
          <Stack.Screen key={name} name={name} options={animation ? { animation } : undefined} />
        ))}
      </Stack>
    </ThemeProvider>
  );
}

export default withObservability(RootLayout);

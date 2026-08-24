import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React from 'react';

import '@/global.css';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppSidebar } from '@/components/app-sidebar';
import AppTabs from '@/components/app-tabs';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { usePreferencesStore } from '@/stores/preferences-store';

export default function TabLayout() {
  const colorScheme = useResolvedColorScheme();
  const preferencesHydrated = usePreferencesStore((state) => state.hasHydrated);

  if (!preferencesHydrated) {
    return <AnimatedSplashOverlay />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppSidebar>
        <AppTabs />
      </AppSidebar>
    </ThemeProvider>
  );
}

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Platform } from 'react-native';

import { logEvent, reportError } from '@/observability/logger';
import { preferencesStorage } from '@/storage/preferences-storage';

export type ThemePreference = 'system' | 'light' | 'dark';

type PreferencesState = {
  themePreference: ThemePreference;
  calendarExpanded: boolean;
  hasHydrated: boolean;
  setThemePreference: (themePreference: ThemePreference) => void;
  setCalendarExpanded: (calendarExpanded: boolean) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      calendarExpanded: true,
      hasHydrated: Platform.OS === 'web',
      setThemePreference: (themePreference) => set({ themePreference }),
      setCalendarExpanded: (calendarExpanded) => set({ calendarExpanded }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'plantory-preferences',
      storage: createJSONStorage(() => preferencesStorage),
      partialize: ({ themePreference, calendarExpanded }) => ({
        themePreference,
        calendarExpanded,
      }),
      onRehydrateStorage: () => (_state, error) => {
        usePreferencesStore.setState({ hasHydrated: true });
        if (error) reportError(error, 'preferences.hydration.failed');
        else logEvent('info', 'preferences.hydration.completed');
      },
      version: 1,
    },
  ),
);

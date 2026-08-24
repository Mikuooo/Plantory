import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePreferencesStore } from '@/stores/preferences-store';

export function useResolvedColorScheme(): 'light' | 'dark' {
  const systemColorScheme = useColorScheme();
  const themePreference = usePreferencesStore((state) => state.themePreference);

  if (themePreference !== 'system') {
    return themePreference;
  }

  return systemColorScheme === 'dark' ? 'dark' : 'light';
}

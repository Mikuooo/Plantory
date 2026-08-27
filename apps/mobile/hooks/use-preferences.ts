import { usePreferencesStore } from '@/stores/preferences-store';

export function usePreferencesHydrated() {
  return usePreferencesStore((state) => state.hasHydrated);
}

export function useCalendarPreferences() {
  const calendarExpanded = usePreferencesStore((state) => state.calendarExpanded);
  const setCalendarExpanded = usePreferencesStore((state) => state.setCalendarExpanded);

  return { calendarExpanded, setCalendarExpanded };
}

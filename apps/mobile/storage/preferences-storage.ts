import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

import { reportError } from '@/observability/logger';

export const preferencesStorage: StateStorage = {
  getItem: (name) => AsyncStorage.getItem(name),
  setItem: async (name, value) => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch (error) {
      reportError(error, 'storage.preferences.write_failed', { adapter: 'async-storage' });
      throw error;
    }
  },
  removeItem: async (name) => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (error) {
      reportError(error, 'storage.preferences.delete_failed', { adapter: 'async-storage' });
      throw error;
    }
  },
};

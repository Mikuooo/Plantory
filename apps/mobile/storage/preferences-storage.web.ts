import type { StateStorage } from 'zustand/middleware';

import { reportError } from '@/observability/logger';

const getBrowserStorage = () => (
  typeof window === 'undefined' ? null : window.localStorage
);

export const preferencesStorage: StateStorage = {
  getItem: (name) => getBrowserStorage()?.getItem(name) ?? null,
  setItem: (name, value) => {
    try {
      getBrowserStorage()?.setItem(name, value);
    } catch (error) {
      reportError(error, 'storage.preferences.write_failed', { adapter: 'local-storage' });
      throw error;
    }
  },
  removeItem: (name) => {
    try {
      getBrowserStorage()?.removeItem(name);
    } catch (error) {
      reportError(error, 'storage.preferences.delete_failed', { adapter: 'local-storage' });
      throw error;
    }
  },
};

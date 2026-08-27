import type { StateStorage } from 'zustand/middleware';

import { reportError } from '@/observability/logger';

const getBrowserStorage = () => (
  typeof window === 'undefined' ? null : window.localStorage
);

export const assetStorage: StateStorage = {
  getItem: (name) => getBrowserStorage()?.getItem(name) ?? null,
  setItem: (name, value) => {
    try {
      getBrowserStorage()?.setItem(name, value);
    } catch (error) {
      reportError(error, 'storage.asset.write_failed', { adapter: 'local-storage' });
      throw error;
    }
  },
  removeItem: (name) => {
    try {
      getBrowserStorage()?.removeItem(name);
    } catch (error) {
      reportError(error, 'storage.asset.delete_failed', { adapter: 'local-storage' });
      throw error;
    }
  },
};

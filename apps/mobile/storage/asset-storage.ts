import SQLiteStorage from 'expo-sqlite/kv-store';
import type { StateStorage } from 'zustand/middleware';

import { reportError } from '@/observability/logger';

export const assetStorage: StateStorage = {
  getItem: (name) => SQLiteStorage.getItem(name),
  setItem: async (name, value) => {
    try {
      await SQLiteStorage.setItem(name, value);
    } catch (error) {
      reportError(error, 'storage.asset.write_failed', { adapter: 'sqlite-kv' });
      throw error;
    }
  },
  removeItem: async (name) => {
    try {
      await SQLiteStorage.removeItem(name);
    } catch (error) {
      reportError(error, 'storage.asset.delete_failed', { adapter: 'sqlite-kv' });
      throw error;
    }
  },
};

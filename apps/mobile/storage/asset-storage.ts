import SQLiteStorage from 'expo-sqlite/kv-store';
import type { StateStorage } from 'zustand/middleware';

export const assetStorage: StateStorage = {
  getItem: (name) => SQLiteStorage.getItem(name),
  setItem: (name, value) => SQLiteStorage.setItem(name, value),
  removeItem: (name) => SQLiteStorage.removeItem(name),
};

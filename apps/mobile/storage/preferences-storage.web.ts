import type { StateStorage } from 'zustand/middleware';

const getBrowserStorage = () => (
  typeof window === 'undefined' ? null : window.localStorage
);

export const preferencesStorage: StateStorage = {
  getItem: (name) => getBrowserStorage()?.getItem(name) ?? null,
  setItem: (name, value) => {
    getBrowserStorage()?.setItem(name, value);
  },
  removeItem: (name) => {
    getBrowserStorage()?.removeItem(name);
  },
};

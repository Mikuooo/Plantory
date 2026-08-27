import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { assetStorage } from '@/storage/asset-storage';

export type AssetCategory = 'pots' | 'media' | 'fertilizers' | 'pesticides';

export type GeneralAssetCategory = Exclude<AssetCategory, 'pots'>;

export type GeneralAssetItem = {
  id: string;
  category: GeneralAssetCategory;
  name: string;
  quantity: number;
  unit: string;
  notes: string;
  updatedAt: string;
};

export type PotShape = 'round' | 'square';
export type PotMaterial = 'ceramic' | 'plastic' | 'terracotta' | 'cement' | 'other';
export type PurchaseMethod = 'online' | 'offline' | 'gift' | 'selfMade' | 'other';

export type PotDimensions = {
  shape: PotShape;
  topDiameterMm: number;
  bottomDiameterMm: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
};

export type PotAssetItem = {
  id: string;
  category: 'pots';
  name: string;
  capacityMl: number | null;
  dimensions: PotDimensions;
  quantity: number;
  purchaseMethod: PurchaseMethod;
  unitPriceCents: number | null;
  currency: 'CNY';
  notes: string;
  appearance: {
    color: string;
    material: PotMaterial;
  };
  updatedAt: string;
};

export type AssetItem = GeneralAssetItem | PotAssetItem;
export type AssetDraft = Pick<GeneralAssetItem, 'name' | 'quantity' | 'unit' | 'notes'>;
export type PotAssetDraft = Omit<PotAssetItem, 'id' | 'category' | 'updatedAt'>;

type AssetState = {
  items: AssetItem[];
  hasHydrated: boolean;
  addItem: (category: GeneralAssetCategory, draft: AssetDraft) => void;
  updateItem: (id: string, draft: AssetDraft) => void;
  addPot: (draft: PotAssetDraft) => string;
  updatePot: (id: string, draft: PotAssetDraft) => void;
  removeItem: (id: string) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

const createAssetId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useAssetStore = create<AssetState>()(
  persist(
    (set) => ({
      items: [],
      hasHydrated: false,
      addItem: (category, draft) => set((state) => ({
        items: [
          ...state.items,
          {
            id: createAssetId(),
            category,
            ...draft,
            updatedAt: new Date().toISOString(),
          },
        ],
      })),
      updateItem: (id, draft) => set((state) => ({
        items: state.items.map((item) => item.id === id && item.category !== 'pots'
          ? { ...item, ...draft, updatedAt: new Date().toISOString() }
          : item),
      })),
      addPot: (draft) => {
        const id = createAssetId();
        set((state) => ({
          items: [...state.items, {
            id,
            category: 'pots',
            ...draft,
            updatedAt: new Date().toISOString(),
          }],
        }));
        return id;
      },
      updatePot: (id, draft) => set((state) => ({
        items: state.items.map((item) => item.id === id && item.category === 'pots'
          ? { ...item, ...draft, updatedAt: new Date().toISOString() }
          : item),
      })),
      removeItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      })),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'plantory-assets',
      storage: createJSONStorage(() => assetStorage),
      partialize: ({ items }) => ({ items }),
      onRehydrateStorage: () => () => {
        useAssetStore.setState({ hasHydrated: true });
      },
      migrate: (persistedState, version) => {
        if (version >= 2) return persistedState as AssetState;
        const state = persistedState as { items?: Record<string, unknown>[] };
        return {
          ...state,
          items: (state.items ?? []).map((item) => item.category === 'pots'
            ? migrateLegacyPot(item)
            : item),
        } as unknown as AssetState;
      },
      version: 2,
    },
  ),
);

function migrateLegacyPot(item: Record<string, unknown>): PotAssetItem {
  return {
    id: String(item.id),
    category: 'pots',
    name: String(item.name ?? '未命名花盆'),
    capacityMl: null,
    dimensions: {
      shape: 'round',
      topDiameterMm: 150,
      bottomDiameterMm: 110,
      lengthMm: 150,
      widthMm: 150,
      heightMm: 140,
    },
    quantity: Number(item.quantity) || 0,
    purchaseMethod: 'other',
    unitPriceCents: null,
    currency: 'CNY',
    notes: String(item.notes ?? ''),
    appearance: { color: '#B56A42', material: 'terracotta' },
    updatedAt: String(item.updatedAt ?? new Date().toISOString()),
  };
}

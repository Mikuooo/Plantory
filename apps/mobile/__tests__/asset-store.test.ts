jest.mock('@/storage/asset-storage', () => ({
  assetStorage: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));
jest.mock('@/observability/logger', () => ({
  logEvent: jest.fn(),
  reportError: jest.fn(),
}));

import { logEvent, reportError } from '@/observability/logger';
import { assetStorage } from '@/storage/asset-storage';
import { useAssetStore, type PotAssetItem } from '@/stores/asset-store';

const mockAssetStorage = jest.mocked(assetStorage);
const mockLogEvent = jest.mocked(logEvent);
const mockReportError = jest.mocked(reportError);

const potDraft = {
  name: '测试花盆',
  capacityMl: 3500,
  dimensions: {
    shape: 'round' as const,
    topDiameterMm: 150,
    bottomDiameterMm: 110,
    lengthMm: 150,
    widthMm: 150,
    heightMm: 140,
  },
  quantity: 1,
  purchaseMethod: 'offline' as const,
  unitPriceCents: 2990,
  currency: 'CNY' as const,
  notes: '本地测试',
  appearance: { color: '#B56A42', material: 'terracotta' as const },
};

describe('asset store offline contract', () => {
  beforeEach(() => {
    useAssetStore.setState({ items: [], hasHydrated: true });
    jest.clearAllMocks();
    jest.mocked(mockAssetStorage.getItem).mockReturnValue(null);
  });

  test('creates, updates, and deletes independent local assets', () => {
    const state = useAssetStore.getState();
    state.addItem('media', {
      name: '火山石',
      quantity: 2,
      unit: '袋',
      notes: '颗粒介质',
    }, { correlationId: 'general-flow' });
    const potId = useAssetStore.getState().addPot(potDraft, { correlationId: 'pot-flow' });

    const [general, pot] = useAssetStore.getState().items;
    expect(general).toEqual(expect.objectContaining({
      category: 'media',
      name: '火山石',
      quantity: 2,
    }));
    expect(pot).toEqual(expect.objectContaining({ id: potId, category: 'pots', name: '测试花盆' }));
    expect(general.id).not.toBe(pot.id);

    useAssetStore.getState().updateItem(general.id, {
      name: '赤玉土',
      quantity: 3,
      unit: '袋',
      notes: '',
    }, { correlationId: 'general-update' });
    useAssetStore.getState().updatePot(potId, {
      ...potDraft,
      quantity: 4,
    }, { correlationId: 'pot-update' });

    expect(useAssetStore.getState().items).toEqual([
      expect.objectContaining({ id: general.id, category: 'media', name: '赤玉土', quantity: 3 }),
      expect.objectContaining({ id: potId, category: 'pots', name: '测试花盆', quantity: 4 }),
    ]);

    useAssetStore.getState().removeItem(general.id, { correlationId: 'general-delete' });
    expect(useAssetStore.getState().items).toEqual([
      expect.objectContaining({ id: potId, category: 'pots' }),
    ]);
    useAssetStore.getState().removeItem(potId, { correlationId: 'pot-delete' });
    expect(useAssetStore.getState().items).toEqual([]);

    expect(mockLogEvent.mock.calls).toEqual(expect.arrayContaining([
      ['info', 'asset.created', { category: 'media', result: 'state_updated' }, 'general-flow'],
      ['info', 'asset.created', { category: 'pots', result: 'state_updated' }, 'pot-flow'],
      ['info', 'asset.updated', { category: 'general', result: 'state_updated' }, 'general-update'],
      ['info', 'asset.updated', { category: 'pots', result: 'state_updated' }, 'pot-update'],
      ['info', 'asset.deleted', { category: 'media', result: 'state_updated' }, 'general-delete'],
      ['info', 'asset.deleted', { category: 'pots', result: 'state_updated' }, 'pot-delete'],
    ]));
  });

  test('persists only asset records through the local adapter', () => {
    useAssetStore.getState().addPot(potDraft, { correlationId: 'offline-save' });

    expect(mockAssetStorage.setItem).toHaveBeenCalledWith(
      'plantory-assets',
      expect.any(String),
    );
    const serialized = jest.mocked(mockAssetStorage.setItem).mock.calls.at(-1)?.[1];
    expect(JSON.parse(serialized as string)).toEqual({
      state: {
        items: [expect.objectContaining({ category: 'pots', name: '测试花盆' })],
      },
      version: 2,
    });
  });

  test('keeps general and pot update contracts isolated by category', () => {
    useAssetStore.getState().addItem('fertilizers', {
      name: '缓释肥',
      quantity: 1,
      unit: '瓶',
      notes: '',
    });
    const general = useAssetStore.getState().items[0];
    const potId = useAssetStore.getState().addPot(potDraft);

    useAssetStore.getState().updateItem(potId, {
      name: '不应覆盖花盆',
      quantity: 99,
      unit: '件',
      notes: '',
    });
    useAssetStore.getState().updatePot(general.id, { ...potDraft, name: '不应覆盖肥料' });

    expect(useAssetStore.getState().items).toEqual([
      expect.objectContaining({ id: general.id, category: 'fertilizers', name: '缓释肥' }),
      expect.objectContaining({ id: potId, category: 'pots', name: '测试花盆' }),
    ]);
  });

  test('restores current persisted assets after a cold start', async () => {
    const persistedPot: PotAssetItem = {
      id: 'persisted-pot',
      category: 'pots',
      ...potDraft,
      updatedAt: '2026-08-20T00:00:00.000Z',
    };
    jest.mocked(mockAssetStorage.getItem).mockReturnValue(JSON.stringify({
      state: { items: [persistedPot] },
      version: 2,
    }));
    useAssetStore.setState({ items: [], hasHydrated: false });

    await useAssetStore.persist.rehydrate();

    expect(useAssetStore.getState()).toEqual(expect.objectContaining({
      items: [persistedPot],
      hasHydrated: true,
    }));
    expect(mockLogEvent).toHaveBeenCalledWith(
      'info',
      'asset.hydration.completed',
      { itemCount: 1 },
    );
  });

  test('migrates version one pots while restoring local data', async () => {
    jest.mocked(mockAssetStorage.getItem).mockReturnValue(JSON.stringify({
      state: {
        items: [{
          id: 'legacy-pot',
          category: 'pots',
          name: '旧花盆',
          quantity: 2,
          notes: '保留内容',
          updatedAt: '2026-08-01T00:00:00.000Z',
        }],
      },
      version: 1,
    }));

    await useAssetStore.persist.rehydrate();

    expect(useAssetStore.getState().items).toEqual([
      expect.objectContaining({
        id: 'legacy-pot',
        category: 'pots',
        name: '旧花盆',
        quantity: 2,
        notes: '保留内容',
        dimensions: expect.objectContaining({ shape: 'round' }),
      }),
    ]);
  });

  test('recovers to usable state and reports a hydration read failure', async () => {
    const readError = new Error('local database unavailable');
    jest.mocked(mockAssetStorage.getItem).mockReturnValue(Promise.reject(readError));
    useAssetStore.setState({ items: [], hasHydrated: false });

    await useAssetStore.persist.rehydrate();

    expect(useAssetStore.getState()).toEqual(expect.objectContaining({
      items: [],
      hasHydrated: true,
    }));
    expect(mockReportError).toHaveBeenCalledWith(readError, 'asset.hydration.failed');
  });

  test('recovers to usable state when persisted JSON is corrupted', async () => {
    jest.mocked(mockAssetStorage.getItem).mockReturnValue('{not-json');
    useAssetStore.setState({ items: [], hasHydrated: false });

    await useAssetStore.persist.rehydrate();

    expect(useAssetStore.getState()).toEqual(expect.objectContaining({
      items: [],
      hasHydrated: true,
    }));
    expect(mockReportError).toHaveBeenCalledWith(
      expect.any(SyntaxError),
      'asset.hydration.failed',
    );
  });
});

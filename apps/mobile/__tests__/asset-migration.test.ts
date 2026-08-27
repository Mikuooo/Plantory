jest.mock('@/storage/asset-storage', () => ({
  assetStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('@/observability/logger', () => ({
  logEvent: jest.fn(),
  reportError: jest.fn(),
}));

import { migrateLegacyPot } from '@/stores/asset-store';

describe('asset persistence migration', () => {
  test('upgrades a legacy pot without losing identity or user content', () => {
    expect(migrateLegacyPot({
      id: 'pot-1',
      category: 'pots',
      name: '阳台陶盆',
      quantity: 2,
      notes: '有排水孔',
      updatedAt: '2026-08-01T00:00:00.000Z',
    })).toEqual({
      id: 'pot-1',
      category: 'pots',
      name: '阳台陶盆',
      capacityMl: null,
      dimensions: {
        shape: 'round',
        topDiameterMm: 150,
        bottomDiameterMm: 110,
        lengthMm: 150,
        widthMm: 150,
        heightMm: 140,
      },
      quantity: 2,
      purchaseMethod: 'other',
      unitPriceCents: null,
      currency: 'CNY',
      notes: '有排水孔',
      appearance: { color: '#B56A42', material: 'terracotta' },
      updatedAt: '2026-08-01T00:00:00.000Z',
    });
  });

  test('normalizes incomplete legacy values to usable defaults', () => {
    const migrated = migrateLegacyPot({ id: 7, category: 'pots', quantity: 'invalid' });

    expect(migrated.id).toBe('7');
    expect(migrated.name).toBe('未命名花盆');
    expect(migrated.quantity).toBe(0);
    expect(migrated.notes).toBe('');
    expect(Number.isNaN(Date.parse(migrated.updatedAt))).toBe(false);
  });
});

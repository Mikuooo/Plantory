jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));
jest.mock('@/observability/logger', () => ({ reportError: jest.fn() }));

import SQLiteStorage from 'expo-sqlite/kv-store';

import { reportError } from '@/observability/logger';
import { assetStorage } from '@/storage/asset-storage';

const mockSQLiteStorage = jest.mocked(SQLiteStorage);
const mockReportError = jest.mocked(reportError);

describe('native asset storage adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('writes and removes records through SQLite KV storage', async () => {
    mockSQLiteStorage.setItem.mockResolvedValue(undefined);
    mockSQLiteStorage.removeItem.mockResolvedValue(undefined);

    await assetStorage.setItem('plantory-assets', '{"state":{"items":[]}}');
    await assetStorage.removeItem('plantory-assets');

    expect(mockSQLiteStorage.setItem).toHaveBeenCalledWith(
      'plantory-assets',
      '{"state":{"items":[]}}',
    );
    expect(mockSQLiteStorage.removeItem).toHaveBeenCalledWith('plantory-assets');
    expect(mockReportError).not.toHaveBeenCalled();
  });

  test.each([
    ['write', 'setItem', 'storage.asset.write_failed'],
    ['delete', 'removeItem', 'storage.asset.delete_failed'],
  ] as const)('reports and rethrows a SQLite %s failure', async (_operation, method, event) => {
    const storageError = new Error(`${method} failed`);
    mockSQLiteStorage[method].mockRejectedValueOnce(storageError);

    const operation = method === 'setItem'
      ? assetStorage.setItem('plantory-assets', '{}')
      : assetStorage.removeItem('plantory-assets');

    await expect(operation).rejects.toBe(storageError);
    expect(mockReportError).toHaveBeenCalledWith(
      storageError,
      event,
      { adapter: 'sqlite-kv' },
    );
  });
});

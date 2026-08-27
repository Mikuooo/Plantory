const mockSentryScope = {
  setTag: jest.fn(),
  setContext: jest.fn(),
};

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(() => 'sentry-event-id'),
  init: jest.fn(),
  withScope: jest.fn((callback: (scope: typeof mockSentryScope) => unknown) => callback(mockSentryScope)),
  wrap: jest.fn((component: unknown) => component),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0' } },
}));

import * as Sentry from '@sentry/react-native';

import {
  createCorrelationId,
  logEvent,
  reportError,
  sanitizeLogFields,
  startFlow,
} from '@/observability/logger';
import { initializeObservability } from '@/observability/sentry';

describe('observability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('creates distinct, prefixed correlation identifiers', () => {
    const first = createCorrelationId('asset-save');
    const second = createCorrelationId('asset-save');

    expect(first).toMatch(/^asset-save-/);
    expect(second).toMatch(/^asset-save-/);
    expect(second).not.toBe(first);
  });

  test('redacts sensitive fields without removing operational context', () => {
    expect(sanitizeLogFields({
      category: 'pots',
      mode: 'create',
      assetName: '阳台陶盆',
      notes: '用户备注',
      nested: {
        photoUri: 'file:///private/photo.jpg',
        itemCount: 2,
      },
    })).toEqual({
      category: 'pots',
      mode: 'create',
      assetName: '[redacted]',
      notes: '[redacted]',
      nested: {
        photoUri: '[redacted]',
        itemCount: 2,
      },
    });
  });

  test('keeps one correlation identifier across a complete flow', () => {
    const flow = startFlow('asset.pot.save', { mode: 'create' });
    flow.event('state_updated', { category: 'pots' });
    flow.complete({ result: 'state_updated' });

    const breadcrumbs = jest.mocked(Sentry.addBreadcrumb).mock.calls.map(([breadcrumb]) => breadcrumb);
    expect(breadcrumbs).toHaveLength(3);
    expect(breadcrumbs.map(({ data }) => data?.correlationId)).toEqual([
      flow.correlationId,
      flow.correlationId,
      flow.correlationId,
    ]);
  });

  test('captures an exception with correlation context', () => {
    const result = reportError(new TypeError('broken'), 'asset.pot.save.failed', {
      category: 'pots',
    }, 'flow-test');

    expect(result).toEqual({ correlationId: 'flow-test', eventId: 'sentry-event-id' });
    expect(mockSentryScope.setTag).toHaveBeenCalledWith('plantory.correlation_id', 'flow-test');
    expect(mockSentryScope.setContext).toHaveBeenCalledWith('plantory', expect.objectContaining({
      category: 'pots',
      correlationId: 'flow-test',
    }));
    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(TypeError));
  });

  test('does not let telemetry failures change a local operation outcome', () => {
    jest.mocked(Sentry.addBreadcrumb).mockImplementationOnce(() => {
      throw new Error('breadcrumb transport failed');
    });

    expect(() => logEvent('info', 'asset.created', { category: 'pots' }, 'flow-local'))
      .not.toThrow();

    jest.mocked(Sentry.captureException).mockImplementationOnce(() => {
      throw new Error('event transport failed');
    });

    expect(reportError(new Error('save failed'), 'asset.pot.save.failed', {}, 'flow-local'))
      .toEqual({ correlationId: 'flow-local', eventId: undefined });
  });

  test('does not let SDK initialization failure prevent startup', () => {
    jest.mocked(Sentry.init).mockImplementationOnce(() => {
      throw new Error('SDK initialization failed');
    });

    jest.isolateModules(() => {
      const observability = jest.requireActual<typeof import('@/observability/sentry')>(
        '@/observability/sentry',
      );
      expect(() => observability.initializeObservability()).not.toThrow();
    });
  });

  test('keeps remote reporting disabled when no public DSN is configured', () => {
    const previousDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;

    initializeObservability();

    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({
      enabled: false,
      sendDefaultPii: false,
      enableAutoPerformanceTracing: false,
    }));

    const options = jest.mocked(Sentry.init).mock.calls[0][0];
    expect(options.beforeBreadcrumb?.({ category: 'ui.click', message: '用户内容' }, {})).toBeNull();
    expect(options.beforeSend?.({
      type: undefined,
      message: '用户内容',
      user: { email: 'guest@example.com' },
      request: { url: 'https://private.example.com' },
      exception: { values: [{ type: 'TypeError', value: '用户内容' }] },
    }, {})).toEqual(expect.objectContaining({
      message: 'Application event',
      user: undefined,
      request: undefined,
      exception: { values: [{ type: 'TypeError', value: 'TypeError: application error' }] },
    }));

    if (previousDsn === undefined) delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    else process.env.EXPO_PUBLIC_SENTRY_DSN = previousDsn;
  });
});

import * as Sentry from '@sentry/react-native';
import type { ComponentType } from 'react';

import { logEvent, sanitizeLogFields } from '@/observability/logger';

let initialized = false;

export function initializeObservability() {
  if (initialized) return;
  initialized = true;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();

  try {
    Sentry.init({
      dsn: dsn || undefined,
      enabled: Boolean(dsn),
      environment: __DEV__ ? 'development' : 'production',
      sendDefaultPii: false,
      enableNative: true,
      enableNativeCrashHandling: true,
      enableAutoSessionTracking: true,
      enableAutoPerformanceTracing: false,
      attachStacktrace: true,
      beforeBreadcrumb(breadcrumb) {
        if (breadcrumb.category?.startsWith('ui.') || breadcrumb.category === 'console') return null;
        return {
          ...breadcrumb,
          message: breadcrumb.category?.startsWith('plantory.') ? breadcrumb.message : undefined,
          data: breadcrumb.data ? sanitizeLogFields(breadcrumb.data) : undefined,
        };
      },
      beforeSend(event) {
        return {
          ...event,
          message: event.message ? 'Application event' : undefined,
          exception: event.exception ? {
            ...event.exception,
            values: event.exception.values?.map((exception) => ({
              ...exception,
              value: exception.type ? `${exception.type}: application error` : 'Application error',
            })),
          } : undefined,
          user: undefined,
          request: undefined,
        };
      },
    });
  } catch (error) {
    logEvent('error', 'app.observability.initialization_failed', {
      errorType: error instanceof Error ? error.name : 'UnknownError',
    });
    return;
  }

  logEvent('info', 'app.observability.initialized', {
    crashReportingEnabled: Boolean(dsn),
  });
}

export function withObservability<P extends Record<string, unknown>>(
  component: ComponentType<P>,
) {
  return Sentry.wrap(component);
}

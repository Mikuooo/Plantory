import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFields = Record<string, unknown>;

export type OperationContext = {
  correlationId: string;
};

export type StructuredLogRecord = {
  timestamp: string;
  level: LogLevel;
  event: string;
  sessionId: string;
  correlationId: string;
  platform: string;
  appVersion: string;
  fields: LogFields;
};

const REDACTED = '[redacted]';
const MAX_DEPTH = 4;
const MAX_ITEMS = 20;
const MAX_STRING_LENGTH = 256;
const sensitiveFieldPattern = /(authorization|auth|cookie|dsn|email|image|name|notes?|password|photo|secret|token|uri|url)/i;
const sessionId = createCorrelationId('session');

export function createCorrelationId(prefix = 'flow') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10).padEnd(8, '0');
  return `${prefix}-${timestamp}-${random}`;
}

export function sanitizeLogFields(fields: LogFields): LogFields {
  return sanitizeObject(fields, 0);
}

export function logEvent(
  level: LogLevel,
  event: string,
  fields: LogFields = {},
  correlationId = createCorrelationId(),
) {
  const record: StructuredLogRecord = {
    timestamp: new Date().toISOString(),
    level,
    event,
    sessionId,
    correlationId,
    platform: Platform.OS,
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    fields: sanitizeLogFields(fields),
  };

  writeConsole(record);
  try {
    Sentry.addBreadcrumb({
      category: `plantory.${event}`,
      level: level === 'warn' ? 'warning' : level,
      message: event,
      data: {
        ...record.fields,
        correlationId,
        sessionId,
      },
    });
  } catch {
    // Telemetry must never change the outcome of a local operation.
  }

  return record;
}

export function reportError(
  error: unknown,
  event: string,
  fields: LogFields = {},
  correlationId = createCorrelationId('error'),
) {
  const normalizedError = normalizeError(error);
  const record = logEvent('error', event, {
    ...fields,
    errorType: normalizedError.name,
  }, correlationId);

  let eventId: ReturnType<typeof Sentry.captureException> | undefined;
  try {
    eventId = Sentry.withScope((scope) => {
      scope.setTag('plantory.event', event);
      scope.setTag('plantory.correlation_id', correlationId);
      scope.setContext('plantory', {
        ...record.fields,
        correlationId,
        sessionId,
      });
      return Sentry.captureException(normalizedError);
    });
  } catch {
    // The structured console record above remains available when reporting fails.
  }

  return { correlationId, eventId };
}

export function startFlow(name: string, fields: LogFields = {}) {
  const correlationId = createCorrelationId(name.replaceAll('.', '-'));
  const startedAt = Date.now();
  logEvent('info', `${name}.started`, fields, correlationId);

  return {
    correlationId,
    context: { correlationId } satisfies OperationContext,
    event(event: string, eventFields: LogFields = {}, level: LogLevel = 'info') {
      return logEvent(level, `${name}.${event}`, eventFields, correlationId);
    },
    complete(completionFields: LogFields = {}) {
      return logEvent('info', `${name}.completed`, {
        ...completionFields,
        durationMs: Date.now() - startedAt,
      }, correlationId);
    },
    fail(error: unknown, failureFields: LogFields = {}) {
      return reportError(error, `${name}.failed`, {
        ...failureFields,
        durationMs: Date.now() - startedAt,
      }, correlationId);
    },
  };
}

function sanitizeObject(fields: LogFields, depth: number): LogFields {
  if (depth >= MAX_DEPTH) return {};

  return Object.fromEntries(
    Object.entries(fields)
      .slice(0, MAX_ITEMS)
      .map(([key, value]) => [
        key,
        sensitiveFieldPattern.test(key) ? REDACTED : sanitizeValue(value, depth + 1),
      ]),
  );
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ITEMS).map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === 'object' && depth < MAX_DEPTH) {
    return sanitizeObject(value as LogFields, depth);
  }
  return String(value);
}

function normalizeError(error: unknown) {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error.slice(0, MAX_STRING_LENGTH));
  return new Error('Unknown application error');
}

function writeConsole(record: StructuredLogRecord) {
  const serialized = JSON.stringify(record);
  if (record.level === 'error') console.error(serialized);
  else if (record.level === 'warn') console.warn(serialized);
  else if (record.level === 'debug') console.debug(serialized);
  else console.info(serialized);
}

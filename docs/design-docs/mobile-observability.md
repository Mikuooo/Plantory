# Mobile Observability

Status: implemented

## Problem and source facts

The mobile app previously had no structured application logger, global route
error fallback, crash reporter, or identifier connecting events from one user
operation. The implemented runtime is guest-first and can run without a backend,
so observability cannot become a prerequisite for a successful local write.

The first instrumented business paths are general asset and pot create, update,
and delete operations. They are the current persisted product workflows.

## Contracts and responsibilities

`apps/mobile/observability/logger.ts` owns the vendor-neutral event contract:

- every record has a timestamp, level, event name, process session ID,
  correlation ID, platform, application version, and sanitized fields;
- `startFlow` keeps one correlation ID across the start, state mutation,
  completion, and failure events of an operation;
- development and local diagnostics receive one JSON object per console line;
- Sentry receives sanitized breadcrumbs and captured exceptions.

`apps/mobile/observability/sentry.ts` is the only Sentry initialization boundary.
Remote reporting is enabled only when `EXPO_PUBLIC_SENTRY_DSN` is non-empty.
Default PII, UI interaction breadcrumbs, performance tracing, profiling, and
session replay are disabled. The root Expo Router layout provides a recoverable
error screen with a correlation reference while `Sentry.wrap` captures failures
outside route-level handling.

Log fields must describe operations, not user content. Allowed examples include
category, operation mode, item count, result, duration, platform, and version.
Names, notes, credentials, tokens, DSNs, email addresses, image/photo values,
URIs, and exception messages are redacted by the reporting boundary. Callers
must still avoid passing business records wholesale.

## Failure and offline behavior

An absent DSN, unavailable network, or Sentry transport failure does not block
startup or local data mutations. Structured local logging and the error fallback
remain available. Calls into the reporting SDK are isolated so a synchronous SDK
failure cannot replace a business result or prevent application startup. Asset
flow completion currently means the Zustand state was
updated; it does not claim that the asynchronous KV write is durably flushed.
Storage adapters report asynchronous write and delete failures as separate error
events because Zustand Persist does not propagate a workflow context into its
storage callback.

Event-handler failures are caught at their workflow boundary, reported with the
same correlation ID, and shown as a retryable user-facing error. Render failures
are handled by the root route error boundary. Sensitive configuration is never
committed: `SENTRY_AUTH_TOKEN` belongs in a local ignored environment file or an
EAS sensitive secret.

## Release and compatibility

The integration uses the Expo SDK 55-compatible `@sentry/react-native` version
selected by `expo install`. The Sentry Expo config plugin supplies native build
configuration. Sentry's Metro configuration is composed before NativeWind so
Debug IDs and source maps coexist with the current CSS transform.

Native configuration changes require a new development or release build. Expo
Go can exercise JavaScript fallbacks and local logs but is not sufficient proof
of native crash capture or release source-map symbolication.

Rollback removes Sentry initialization, its Expo and Metro plugins, and the
dependency. The vendor-neutral logger and route fallback can remain without a
remote transport.

## Verification and evidence

- Jest covers identifier uniqueness, field redaction, flow continuity, captured
  error context, and the no-DSN disabled state.
- `pnpm harness:check` covers repository, documentation, architecture, lint,
  TypeScript, and unit tests.
- `expo config --type public` must resolve the Sentry plugin without exposing an
  auth token.
- Production acceptance requires a native release build with Sentry variables,
  a controlled test exception, a matching correlation ID and breadcrumbs in
  Sentry, and a symbolicated application frame.

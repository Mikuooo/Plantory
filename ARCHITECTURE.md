# Plantory Architecture

## Purpose

This file is the top-level map of the implemented system. Product rules live in
`docs/core-beliefs.md`, development details in `docs/development.md`, and scoped
delivery records in `docs/design-docs/` and `docs/exec-plans/`.

## Current Runtime

Plantory currently ships one Expo application:

```text
Expo Router route
  -> screen/component
  -> Zustand store
  -> storage adapter
  -> device persistence

route/store/adapter
  -> structured logger
  -> local JSON console + Sentry breadcrumb/error event
```

- `apps/mobile/app/` owns routes and route composition.
- `apps/mobile/components/` owns reusable screens and visual components.
- `apps/mobile/hooks/` owns reusable React hooks.
- `apps/mobile/stores/` owns temporary UI state and the currently implemented
  persisted asset state.
- `apps/mobile/storage/` adapts AsyncStorage and SQLite KV storage.
- `apps/mobile/observability/` owns structured logging, correlation IDs, privacy
  filtering, and the Sentry adapter.
- `apps/mobile/constants/theme.ts` is the source of truth for visual tokens.

There is no backend service or shared domain package yet. The `packages/` and
`services/` directories are reserved boundaries, not implemented runtimes.

## Allowed Dependency Direction

```text
apps/mobile/app
  -> apps/mobile/components, hooks, constants, observability

apps/mobile/components, hooks
  -> apps/mobile/stores

apps/mobile/stores
  -> apps/mobile/storage, observability

apps/mobile/storage
  -> device persistence, observability

apps/* -> packages/*
services/* -> packages/*
packages/* -X-> apps/*, services/*
services/* -X-> apps/*
```

Routes remain composition modules and do not import stores or storage directly.
Components and hooks may consume stores, but concrete SQLite, AsyncStorage,
SecureStore, and browser storage access belongs only in storage adapters. Stores
and storage cannot depend back on routes or presentation modules.

## Executable Guardrails

`pnpm check:architecture` enforces the dependency graph above, circular-source
checks, and these complexity limits without baseline allowlists:

- route modules under `apps/mobile/app/` have at most 150 physical lines;
- other production TypeScript modules under the mobile runtime have at most 300
  physical lines;
- tests and declaration files are excluded from file-size and production
  dependency-placement rules;
- routes cannot import stores or storage directly;
- components and hooks cannot import storage directly;
- stores and storage cannot depend back on presentation layers;
- concrete persistence SDKs and `localStorage` usage are confined to
  `apps/mobile/storage/`.

`pnpm test:architecture-harness` runs negative fixtures for each rule so a
broken checker cannot silently approve the repository.

## Stable Invariants

- Plants are individual specimens with independent histories.
- Batch care creates one record for every affected plant.
- Core guest workflows remain usable offline.
- A successful local write is not discarded after a remote failure.
- Photos retain capture time and plant association.
- 3D is optional presentation and never the only record path.
- Native Android and iOS are primary; web parity is opt-in per task.
- Operational telemetry excludes credentials and user-authored record content.

## Planned Boundaries

Create a shared package only when it has a real consumer. Expected stable
responsibilities are domain rules, types, validation, repositories, and API
clients. Backend services must enforce authorization and data integrity at their
own boundary. These are target constraints and do not describe implemented
packages or services today.

## Verification

Run `pnpm harness:check` from the repository root. Architecture checks prevent
cycles and forbidden workspace dependency directions. Native behavior still
requires the affected real-device path described in `docs/testing.md`.

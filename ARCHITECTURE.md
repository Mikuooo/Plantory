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
```

- `apps/mobile/app/` owns routes and route composition.
- `apps/mobile/components/` owns reusable screens and visual components.
- `apps/mobile/hooks/` owns reusable React hooks.
- `apps/mobile/stores/` owns temporary UI state and the currently implemented
  persisted asset state.
- `apps/mobile/storage/` adapts AsyncStorage and SQLite KV storage.
- `apps/mobile/constants/theme.ts` is the source of truth for visual tokens.

There is no backend service or shared domain package yet. The `packages/` and
`services/` directories are reserved boundaries, not implemented runtimes.

## Allowed Dependency Direction

```text
apps/mobile/app
  -> apps/mobile/components, hooks, stores, constants
  -> apps/mobile/storage

apps/* -> packages/*
services/* -> packages/*
packages/* -X-> apps/*, services/*
services/* -X-> apps/*
```

The mobile app may currently reach stores from routes because this is existing
behavior. New domain rules and persistence operations belong behind repository
interfaces as shared packages are introduced. Tighten the mechanical boundary
only after existing consumers have migrated.

## Stable Invariants

- Plants are individual specimens with independent histories.
- Batch care creates one record for every affected plant.
- Core guest workflows remain usable offline.
- A successful local write is not discarded after a remote failure.
- Photos retain capture time and plant association.
- 3D is optional presentation and never the only record path.
- Native Android and iOS are primary; web parity is opt-in per task.

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

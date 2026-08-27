# Plantory Shared Packages Agent Guide

## Scope and boundaries

- This file applies to all shared packages under `packages/` and supplements the repository root `AGENTS.md`.
- Organize packages by stable responsibility, such as types, domain rules, validation, repositories, API clients, and design tokens.
- Keep shared packages independent of Expo Router screens and concrete UI components.
- Avoid creating a package until it has a real cross-feature or cross-runtime consumer.

## Domain contracts

- Model every plant as an individual specimen with its own stable identifier and history.
- A batch care command must result in one independent care record per affected plant.
- Keep plants, growth records, care actions, photos, and todos as core domain concepts. Supporting features must not distort their contracts.
- Photo contracts must retain capture time and plant association.
- Represent timestamps, identifiers, optional values, and lifecycle states consistently across packages.
- Make migrations and synchronization contracts explicit enough to move guest data to a signed-in account without changing screen behavior.

## Dependency direction

- Domain logic and shared types must not depend on storage, HTTP, React, or platform APIs.
- Define repository interfaces separately from SQLite, remote API, or test implementations.
- Centralize remote transport behavior in an API client package; callers should not construct ad hoc requests.
- Keep validation reusable at client and service boundaries where the same contract applies.
- Prevent circular package dependencies and avoid broad barrel exports that expose internal implementation details.

## Compatibility and testing

- Treat exported types, functions, schemas, and repository interfaces as public contracts.
- Prefer additive changes. Document and migrate intentional breaking changes across every consumer in the same approved change.
- Add deterministic unit tests for domain invariants, validation boundaries, batch expansion, migrations, and conflict behavior.
- Run the narrowest package checks plus affected consumer typechecks.

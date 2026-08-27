# Plantory Services Agent Guide

## Scope and boundaries

- This file applies to backend APIs, scheduled jobs, and integrations under `services/` and supplements the repository root `AGENTS.md`.
- Keep transport handlers thin. Put business decisions in service or domain layers and persistence behind repositories.
- Reuse shared contracts and validation where appropriate; do not maintain incompatible copies of mobile-facing schemas.
- External integrations must be isolated behind explicit interfaces with bounded timeouts and failure handling.

## Authorization and data integrity

- Enforce authorization at the service and database boundary, including row-level security where applicable.
- Never rely on hidden client controls as an authorization mechanism.
- Scope every user-owned query and mutation to the authenticated owner or an explicitly authorized collaborator.
- Preserve the single-specimen plant model and create an independent record for each plant affected by a batch care action.
- Make multi-record operations transactional when partial completion would violate business invariants.
- Design write endpoints and jobs to be idempotent where retries are possible.

## Migrations and synchronization

- Use reviewed, forward migrations for schema changes. Do not rewrite applied migrations.
- Define ownership, conflict resolution, deletion semantics, and retry behavior for guest-to-cloud migration and synchronization.
- Preserve locally created timestamps and photo metadata when importing guest records.
- Rollout plans for destructive or incompatible changes must include backfill, compatibility window, and rollback behavior.

## Security and operations

- Keep secrets in environment or managed secret storage; never commit credentials or `.env` files.
- Use structured logs with correlation context while excluding tokens, credentials, and sensitive user content.
- Give scheduled jobs observable outcomes, retry limits, and safe concurrency behavior.
- Validate untrusted input at the boundary and return stable, documented error semantics.

## Verification

- Add deterministic tests for authorization, validation, transactions, idempotency, batch expansion, and sync conflict handling.
- Test database policies against allowed and denied users rather than assuming policy correctness from configuration.
- For migrations, verify both a clean database and an upgrade from the latest supported schema when tooling permits.
- Report external-service or infrastructure checks that could not be performed locally.

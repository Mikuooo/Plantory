# Plantory Agent Guide

## Scope and precedence

- This file applies to the whole repository.
- A deeper `AGENTS.md` adds directory-specific requirements and takes precedence when a rule conflicts with this file.
- Directory guides live in `apps/mobile/AGENTS.md`, `packages/AGENTS.md`, `services/AGENTS.md`, and `docs/AGENTS.md`.
- Preserve existing user changes in the worktree. Do not reset, checkout, or rewrite unrelated files.

## Repository knowledge map

- `ARCHITECTURE.md` records the implemented runtime and dependency boundaries.
- `docs/core-beliefs.md` records durable product and engineering invariants.
- `docs/quality.md` records executable coverage and known quality gaps.
- `docs/testing.md` defines deterministic and real-device verification.
- `docs/design-docs/` holds cross-layer technical decisions.
- `docs/exec-plans/` holds long-running execution state and evidence.
- Treat these versioned files as the source of truth; do not rely on chat-only decisions.

## Proposal and approval workflow

- For every user prompt that may lead to repository changes, first perform enough read-only inspection to produce an evidence-based implementation proposal. For bug reports, complete the diagnosis workflow below before proposing a repair; do not propose a speculative fix from the prompt alone.
- The proposal must list the files that are expected to be created, modified, or deleted, along with the intended verification.
- Present only one proposal per prompt. Do not offer competing plans unless the user explicitly asks for alternatives.
- Wait for one user confirmation before editing files or otherwise executing the proposed repair. After confirmation, proceed through implementation and verification without repeatedly asking for approval.
- Read-only inspection used to prepare the proposal does not require confirmation.
- If execution reveals a material scope expansion, a destructive action, or a decision that would substantially change the approved result, stop and explain the new boundary before proceeding.
- A follow-up prompt that changes the requested outcome starts a new proposal and approval cycle. Minor corrections within the approved scope do not.

## Bug diagnosis and repair workflow

- Treat the user's prompt as evidence about the symptom, not as proof of the cause or instructions for which code to change.
- Before proposing a repair, read the relevant source, callers, state flow, styles, persistence, and platform-specific implementations. Check repository history when it helps explain why the current structure exists.
- Reproduce the bug through its real product entry and on the affected physical device when the bug concerns native mobile behavior. Record the actual result, expected result, relevant logs or state, and the conditions that trigger it.
- Identify a root cause that explains both the observed behavior and its relationship to the existing code. Do not edit code merely because a prompt description resembles a familiar issue.
- If the bug cannot be reproduced or the root cause is not supported by evidence, report the attempted path and the missing evidence or environment limitation. Do not make a guess-based repair or claim that the bug is located.
- Only after locating the root cause, present the concrete repair, affected files, behavioral impact, regression risk, and intended verification for approval.
- After implementation, repeat the original reproduction path on the affected physical device and check adjacent behavior that shares the changed code. A passing lint or type check does not replace runtime revalidation.

## Change reasoning and structural consistency

- Before changing a bug, layout, or other behavior, determine how the requested result relates to the existing architecture, shared rules, and the reason for the current implementation.
- Prefer restoring or adjusting the correct shared invariant over accumulating local exceptions. Keep exceptions only while the product requirement that justified them still exists.
- When a previous requirement caused a shared rule to be removed, and that requirement is later reversed, re-evaluate and restore the shared rule instead of preserving the workaround and adding compensating changes to each child.
- For example, if one edge-to-edge element caused a page's shared padding to be removed and sibling elements received individual margins, then that element later stops being edge-to-edge, restore the page-level padding and remove the redundant per-element margins when the surrounding layout confirms that is the original invariant.
- Trace all consumers of a shared style, component, state contract, or business rule before changing it. Include required cleanup of obsolete workarounds in the proposed impact files and verify both the requested behavior and neighboring consumers.

## Project shape

- This is a pnpm workspace managed as a Turborepo.
- `apps/mobile` is the current Expo Router application.
- `packages/*` is reserved for shared types, domain logic, API clients, validation, and design tokens.
- `services/*` is reserved for backend APIs, scheduled jobs, and integrations.
- `docs/*` contains product and development decisions; update it when a change alters a documented contract or workflow.

## Product invariants

- A plant is recorded as an individual specimen, never only as a species-level aggregate.
- A batch care action must produce an independent record for every affected plant.
- Core records are plants, growth records, care actions, photos, and todos. Expenses, inventory, weather risk, and accounts are supporting capabilities.
- Photos retain capture time and plant association.
- Guest/local data must remain usable offline and be migratable to a signed-in cloud account when that flow is implemented.
- 3D is an optional presentation layer and must not be the only path to create or inspect records.

## Implementation boundaries

- Keep `app/` focused on routes and page composition.
- Put reusable UI in `components/`; keep platform-specific files explicit with `.web` or native variants.
- Put business rules in shared packages instead of embedding them in screens.
- Centralize network access in an API client package; do not scatter raw fetch/database calls through UI components.
- Enforce authorization at the service/database boundary (including RLS where applicable), not only by hiding client controls.
- Prefer existing Expo/React Native and repository patterns over new abstractions.
- Keep changes narrowly scoped; avoid unrelated formatting, dependency, or metadata churn.

## Working commands

Run from the repository root after dependencies are installed:

```powershell
pnpm install
pnpm --filter plantory start
pnpm --filter plantory android
pnpm --filter plantory ios
pnpm --filter plantory web
pnpm --filter plantory lint
```

For a change, run the narrowest relevant checks and report any command that could not run. Add deterministic tests when introducing shared logic, persistence, navigation contracts, or user-visible behavior.

## UI and accessibility

- Follow the established Plantory theme and do not introduce a second visual system. Mobile theme implementation details are defined in `apps/mobile/AGENTS.md`, with `apps/mobile/constants/theme.ts` as the code source of truth.
- Treat the native mobile app as the primary product surface. Web parity is out of scope unless a task explicitly asks for it.
- Use accessible labels, sensible hit targets, and loading/empty/error states for data-driven screens.
- Keep navigation labels aligned with the product vocabulary: calendar, plants, and archive.

## Guest-first mobile behavior

- Every core mobile workflow must work before a backend is connected: create a plant, edit its profile, add care/growth records, attach photos, manage todos, and browse/archive history.
- Use local persistence as the source of truth for guest mode. Do not gate core actions behind authentication or network availability.
- Keep storage, repositories, and sync behind interfaces so a later account sign-in can migrate guest records to the cloud without rewriting screens.
- Authentication is an optional upgrade path: sign-in links or migrates local data, while sign-out preserves clearly defined local guest data.
- Network failure must degrade to local operation with an explicit sync state; never discard a successful local write because a remote request failed.

## Git and delivery discipline

- Inspect `git status` before editing and review the final diff.
- Never commit secrets, `.env` files, generated build output, or credentials.
- Do not change lockfiles or dependencies unless required by the requested behavior.
- Update docs and examples when public commands, routes, schemas, or environment variables change.
- In the handoff, summarize changed files, verification performed, known limitations, and any pre-existing worktree changes.

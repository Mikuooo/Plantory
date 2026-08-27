# Mobile Architecture Hardening

Status: completed

## Scope

Reduce the oversized mobile UI modules, remove route-to-store imports, and
enable deterministic architecture rules only after the existing tree passes
without allowlists. Preserve navigation, calendar gestures, asset behavior,
offline persistence, and observability contracts.

## Requirement ledger

| ID | Requirement | Depends on | Phase | Gate | Evidence |
| --- | --- | --- | --- | --- | --- |
| R-ARCH-01 | Split the plant list route into route composition, model helpers, and reusable UI | None | DONE | PASS | Model tests and typecheck pass; route is 3 lines and production modules are at most 263 lines |
| R-ARCH-02 | Split calendar motion, date helpers, and grid presentation without changing gestures | None | DONE | PASS | Date tests pass; Android collapse, cross-week month transition, and expand paths passed |
| R-ARCH-03 | Extract the general asset editor so production UI files stay within the limit | None | DONE | PASS | Asset tests pass; category/editor are 200/165 lines; Android empty-state editor open/close passed |
| R-ARCH-04 | Remove direct route imports of stores and storage | R-ARCH-01 | DONE | PASS | No route imports stores or storage; architecture check passes |
| R-ARCH-05 | Enforce file-size, dependency-direction, persistence-boundary, and cycle rules with no allowlist | R-ARCH-01 through R-ARCH-04 | DONE | PASS | Negative fixtures and current-tree check pass for 83 source files |
| R-ARCH-06 | Synchronize architecture, quality, testing, and execution evidence | R-ARCH-05 | DONE | PASS | Stable docs and full repository harness pass |

## Baseline

- `apps/mobile/components/calendar.tsx`: 555 physical lines.
- `apps/mobile/app/(tabs)/plants.tsx`: 420 physical lines.
- `apps/mobile/components/asset-category-screen.tsx`: 353 physical lines.
- `apps/mobile/app/_layout.tsx` and `apps/mobile/app/(tabs)/index.tsx`
  directly imported Zustand stores.
- The architecture check prevented cycles and a small set of workspace direction
  violations, but had no file-size policy or persistence SDK rule.

## Enabled rules

- Route modules under `apps/mobile/app/` have at most 150 physical lines.
- Mobile production TypeScript modules have at most 300 physical lines.
- Tests and declaration files are excluded from file-size and production
  dependency-placement rules.
- Routes do not import stores or storage directly.
- Components and hooks do not import storage directly.
- Stores and storage do not depend back on presentation layers.
- Concrete persistence SDKs are imported only by storage adapters.
- Shared packages and services retain their direction constraints.
- No baseline allowlist or grandfathered violation is permitted.

## Delivered structure

1. Plant list data/grouping helpers and card presentation are separate from a
   thin route module.
2. Preference store access is hidden behind hooks consumed by route composition.
3. Calendar date helpers, motion orchestration, types, and grid presentation are
   independent modules.
4. The general asset editor is separate from asset list orchestration.
5. Architecture analysis is a pure rule module consumed by repository checks
   and negative fixtures.

## Verification evidence

- `pnpm harness:check`: passed.
- Documentation: 15 Markdown files passed.
- Architecture negative fixtures: passed.
- Current architecture: 83 source files passed with no allowlists.
- Expo compatibility and process runner checks: passed.
- Jest: 8 suites and 32 tests passed.
- Android device: `emulator-5554`, model `2509FPN0BC`, Expo Go with the existing
  Metro server on port 8081.
- Android calendar: collapse exposed one expand control, horizontal week paging
  reached September 2026, and expand restored 46 accessible date buttons.
- Android plant list: grouping controls, search field, and plant cards rendered.
- Android asset path: media remained at 0 items; editor opened and closed without
  a write; the app returned to the calendar with no React Native error log.
- Automated `pnpm e2e:android`: blocked before device operations because Maestro
  is not installed on `PATH`. This did not invalidate the completed manual paths
  but remains a limitation for repeatable native evidence.

## Compatibility, rollback, and cleanup

No routes, persisted schemas, asset IDs, log events, dependencies, or native
configuration changed. The manual device run created no business records and
left the app on the calendar. No temporary repository resources remain. Rollback
is source-only and requires no data migration.

## Git state at completion

- Branch and source baseline: `master` at `eea2d76`, tracking `origin/master`.
- The worktree remains intentionally dirty with this delivery plus pre-existing
  user-owned observability, asset, E2E harness, documentation, and screenshot
  changes.
- No commit or push was requested or performed.

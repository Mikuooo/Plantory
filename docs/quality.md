# Quality Scorecard

Status values are `green`, `yellow`, and `red`. Update this file when a gate is
added, removed, or materially changes confidence.

| Area | Status | Automated evidence | Current gap |
| --- | --- | --- | --- |
| Type safety | green | `pnpm typecheck` | Runtime input validation is not established |
| Lint | green | `pnpm lint` | No component complexity limit yet |
| Unit tests | yellow | `pnpm test` | Initial coverage targets assets and navigation |
| Architecture | yellow | `pnpm check:architecture` | Existing route-local screen logic is baseline debt |
| Documentation | yellow | `pnpm check:docs` | Freshness is reviewed, not inferred automatically |
| Native E2E | yellow | Maestro flows under `.maestro/` | Local physical-device gate; not PR-blocking yet |
| Expo compatibility | yellow | `pnpm --filter plantory exec expo install --check` | SDK 55 patch-level drift is present and requires a dedicated upgrade change |
| Observability | red | None | No structured application logging or crash reporting |
| Backend security | not applicable | None | Backend is not implemented |

## Promotion Rules

- A yellow gate becomes green after it is deterministic in CI and has an owner.
- Native E2E becomes PR-blocking only after ten consecutive stable controlled
  runs with no infrastructure-only failures.
- New architectural restrictions must first pass against the existing tree.
- Known debt is not hidden with exclusions unless the exclusion is documented
  here with removal criteria.

## Delivery Metrics

Review monthly once enough changes exist:

- first-pass rate for `pnpm harness:check`;
- flaky-check rate;
- escaped defects found after merge;
- changes requiring undocumented human context;
- age of active execution plans and unresolved quality gaps.

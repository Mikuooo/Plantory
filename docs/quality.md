# Quality Scorecard

Status values are `green`, `yellow`, and `red`. Update this file when a gate is
added, removed, or materially changes confidence.

| Area | Status | Automated evidence | Current gap |
| --- | --- | --- | --- |
| Type safety | green | `pnpm typecheck` | Runtime input validation is not established |
| Lint | green | `pnpm lint` | No component complexity limit yet |
| Unit tests | yellow | `pnpm test`: asset CRUD, persistence recovery, navigation, and observability | Plant, care, growth, photo, and todo persistence are not implemented yet |
| Architecture | green | Complexity, dependency, persistence-boundary, cycle, and negative rule checks in CI | No known architecture-gate gap |
| Documentation | yellow | `pnpm check:docs` | Freshness is reviewed, not inferred automatically |
| Ownership | green | CODEOWNERS, freshness owner validation, and PR review checklist | Advisory routing; required owner approval is intentionally disabled |
| Native E2E | yellow | `Native E2E` workflow and `pnpm e2e:android` | Requires 10 consecutive controlled runs before PR blocking |
| Expo compatibility | green | `pnpm check:expo` in `pnpm harness:check` | No known SDK 55 compatibility drift |
| Observability | yellow | Logger/Sentry unit tests and root error boundary | Release crash event and source-map symbolication require configured Sentry credentials |
| Backend security | not applicable | None | Backend is not implemented |

## Promotion Rules

- A yellow gate becomes green after it is deterministic in CI and has an owner.
- Native E2E becomes PR-blocking only after ten consecutive stable controlled
  runs with no infrastructure-only failures. The `Native E2E` workflow reports
  the current count but remains non-required until the threshold is met.
- New architectural restrictions must first pass against the existing tree.
- Known debt is not hidden with exclusions unless the exclusion is documented
  here with removal criteria.

## Delivery Metrics

The `Quality Trends` workflow publishes a rolling 12-week report every Monday.
Metric contracts and the local fixture command are defined in
[`quality-trends.md`](./quality-trends.md).

Quality gates and repository knowledge are currently owned by `@Mikuooo` under
the advisory contract in [`ownership.md`](./ownership.md). Ownership routes
review and maintenance responsibility without replacing executable gates.

- CI first-pass rate measures completed first attempts of the `Quality` workflow.
- Test flake rate requires a failed `Unit tests` step to pass on a rerun of the
  same workflow run and commit.
- Document staleness uses explicit review history and per-document age limits.
- Escaped defects are defects first detected after the responsible change was
  merged or released.

Cancelled and skipped runs do not enter a denominator. Missing or inaccessible
Actions data fails report generation instead of being treated as a zero value.

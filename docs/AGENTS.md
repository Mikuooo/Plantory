# Plantory Documentation Agent Guide

## Scope and source of truth

- This file applies to documentation under `docs/` and supplements the repository root `AGENTS.md`.
- Use `ARCHITECTURE.md`, `core-beliefs.md`, `quality.md`, and `testing.md` as the stable knowledge map before adding topic-specific guidance.
- Documentation must reflect the repository's actual commands, routes, schemas, environment variables, and implemented behavior.
- Clearly label planned, experimental, and implemented capabilities. Never describe a roadmap item as complete.
- When code and documentation disagree, investigate the implementation and product decision rather than silently choosing one.

## Content standards

- Use Plantory product vocabulary consistently: calendar, plants, archive, care actions, growth records, photos, and todos.
- Preserve the distinction between core records and supporting capabilities.
- Record durable architecture and product decisions; avoid transient implementation narration that will become stale quickly.
- Include prerequisites, working directory, and expected effect for executable commands.
- Never include real credentials, personal data, private endpoints, or copied `.env` values in examples.
- Prefer relative repository links and paths that remain valid across developer machines.

## Change synchronization

- Update documentation in the same approved change when public commands, routes, schemas, environment variables, workflows, or compatibility requirements change.
- Keep route diagrams synchronized with the actual Expo Router file structure.
- Keep dependency and SDK guidance version-specific when compatibility depends on an exact version.
- Document migrations, rollout constraints, and known limitations when they affect users or future contributors.

## Verification

- Check local links, referenced paths, commands, headings, and code fences after editing documentation.
- Compare documented route and project trees with the filesystem.
- Review the final diff for accidental claims about unimplemented behavior.

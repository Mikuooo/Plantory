# Plantory Mobile Agent Guide

## Scope and upstream rules

- This file applies to `apps/mobile` and supplements the repository root `AGENTS.md`.
- Read the exact Expo SDK 55 documentation at `https://docs.expo.dev/versions/v55.0.0/` before changing Expo APIs, configuration, native modules, routing, or build behavior.
- Treat the native iOS and Android application as the primary surface. Web parity is required only when the user explicitly requests it.

## Architecture

- Keep `app/` files focused on Expo Router routes and page composition.
- Put reusable visual components in `components/`, reusable hooks in `hooks/`, and theme constants in `constants/`.
- Use explicit `.web.tsx` or native variants when platform behavior genuinely differs; keep their public contracts aligned.
- Do not put domain rules, SQLite statements, remote requests, or synchronization logic directly in screens.
- Consume domain, repository, validation, and API contracts from shared packages as those packages are introduced.
- Preserve typed routes. When routes change, update navigation calls, deep-link assumptions, and route documentation together.

## Guest-first data behavior

- Core workflows must work locally without authentication or network access: plants, care actions, growth records, photos, todos, and archive browsing.
- Treat local persistence as the source of truth for guest mode and expose it through repository interfaces.
- A successful local write must remain successful when remote synchronization fails. Surface pending or failed sync state explicitly.
- Store business records in SQLite, sensitive credentials in SecureStore, temporary UI state in Zustand, and remote cache state in TanStack Query.
- Copy camera or image-picker results into durable application storage before persisting their URI.
- Preserve photo capture time and plant association.

## UI, theme, and icons

- Treat `constants/theme.ts` as the single code source of truth for theme values. Do not duplicate palette literals in components or agent documentation.
- New components must use the semantic `Colors` tokens: `primary`, `primarySoft`, `background`, `backgroundElement`, `backgroundSelected`, `text`, `textSecondary`, `border`, and `accent`.
- Keep token roles consistent: `primary` for actions and links, `primarySoft` for supportive action surfaces, `border` for separators, and `accent` for secondary attention states.
- Preserve both light and dark behavior across splash, tabs, headers, calendars, todos, forms, empty states, and new feature surfaces.
- Do not reintroduce the Expo template palette or add a second visual system.
- Use NativeWind v5 incrementally without bypassing theme semantics or restyling unrelated components.
- Use `MaterialCommunityIcons` as the custom UI icon family and keep size, weight, and theme color treatment consistent.
- Import custom UI icons through `components/icons/AppIcon`; do not import vendor icon components in feature screens.
- Add semantic icon names to `components/icons/icon-map.ts` rather than exposing vendor glyph names.
- Keep the semantic icon map small and reviewed. Native tab assets are allowed where the Expo native tabs API requires them, but they must follow the same semantic icon direction.
- Use accessible labels and roles, sensible mobile hit targets, and loading, empty, and error states for data-driven views.
- Keep visible navigation vocabulary consistent: calendar, plants, and archive.

## Expo and dependencies

- Use `npx expo install` for Expo native modules so versions remain compatible with SDK 55.
- Do not upgrade Expo, React Native, NativeWind preview, or native modules as incidental work.
- Do not edit generated native projects or build output unless the approved task explicitly requires prebuild/native changes.
- Keep app configuration changes in `app.json` narrowly tied to the requested capability.

## Development server lifecycle

- Use one long-running Expo Metro development server for Plantory and connect both web and Android to that same instance.
- Prefer the existing `pnpm --filter plantory start` server and Expo's `w` and `a` commands over launching separate `web` or `android` server processes.
- Before starting Metro, check whether the Plantory server is already listening on the default Expo port `8081`. Reuse it when it is running.
- Do not unconditionally start a development server after each task, and do not create another Metro instance merely to verify a source change.
- If port `8081` is occupied by an unrelated process, report the conflict instead of automatically accepting or selecting an incremented port.
- Rely on Fast Refresh for ordinary JavaScript, TypeScript, component, and style changes.
- Restart Metro only when required by configuration, bundler, environment, or cache changes. Rebuild the native app only when native dependencies or native configuration change.
- Do not stop a user-owned development server unless the user explicitly requests it or the approved task requires a controlled restart.

## Verification

- Run `pnpm --filter plantory lint` and `pnpm --filter plantory typecheck` for code changes when the environment permits.
- Add deterministic tests for shared behavior, persistence, navigation contracts, data migration, and user-visible state transitions.
- For native UI changes, verify the affected workflow on the relevant native target. Report any simulator, device, permission, or toolchain limitation.
- When a change has a platform-specific implementation, verify each affected implementation or clearly disclose the unverified platform.

# Testing And Evidence

## Deterministic Gate

From the repository root run:

```powershell
pnpm harness:check
```

The command checks repository structure, documentation links, architecture,
Expo SDK dependency compatibility, lint, TypeScript, and Jest tests. It must not
require network access after dependencies are installed. The Expo compatibility
step runs the equivalent of `CI=1 expo install --check`, so local and CI runs
fail on the same manifest or lockfile drift instead of prompting to repair it.

## Mobile Unit Tests

Plantory uses Jest with the `jest-expo` preset. Keep tests outside `app/` because
Expo Router treats files under `app/` as routes. Prefer state transitions and
business outcomes over implementation snapshots.

The deterministic offline asset contract covers:

- independent general-asset and pot create, update, and delete transitions;
- category isolation and correlation IDs on asset state events;
- serialized local state, current-version cold-start recovery, and legacy pot
  migration;
- rejected reads and corrupted persisted JSON recovering to a usable hydrated
  state with an error report;
- SQLite KV write and delete failures being reported and rethrown;
- primary tabs and registered asset/plant detail routes remaining unique and in
  the product-defined order.

These tests prove the currently implemented asset workflow without a network or
account. They do not claim offline persistence for plants, care, growth, photos,
or todos; those workflows require real repositories before they can be accepted.

## Architecture Gates

Run the negative rule fixtures and the current-tree check from the repository
root:

```powershell
pnpm test:architecture-harness
pnpm check:architecture
```

The first command proves that oversized files, forbidden dependency directions,
route or component persistence access, misplaced persistence SDKs, and cycles
are rejected. The second command applies those same rules to the repository.
There are no baseline allowlists; split or migrate an existing consumer before
enabling a stricter rule.

## Android Device Flows

Maestro flows under `.maestro/` cover the current native smoke and pot asset
workflow. Prerequisites:

1. A compatible Android device or emulator is connected.
2. Plantory is installed and can open the project through the existing Metro
   server on port 8081.
3. Maestro is installed and available on `PATH`.

Run:

```powershell
pnpm e2e:android
```

The default URL is `exp://127.0.0.1:8081/--/` and explicitly targets the Expo
Router root route. The wrapper creates a temporary `adb reverse` mapping for
host port 8081, so the same single command works for an emulator or a USB-connected
physical device. To use Metro on another host, pass a device-reachable URL:

```powershell
pnpm e2e:android -ExpoUrl exp://<development-host>:8081/--/
```

The wrapper requires `maestro` and the Android SDK `adb` on `PATH`, Metro on port
8081 for the default URL, and exactly one online device unless `-DeviceId` is
passed directly to the wrapper. It replaces a conflicting non-SDK ADB server on
port 5037, binds every device command and Maestro stage to the selected device,
and applies hard timeouts with process-tree cleanup. It writes environment
identity, JUnit, console, debug, screenshot, and per-command evidence to a UTC
run directory under `.artifacts/`.

On Android systems that do not register Maestro's companion input method, the
wrapper automatically uses staged Maestro flows with `adb shell input text` for
the two ASCII test values. Navigation, actions, state assertions, and cleanup
remain under Maestro control, and every stage receives its own JUnit report.

Store transient screenshots and logs under `.artifacts/<run-id>/`. The directory
is ignored by Git. A delivery report must identify the device, app build, flow,
result, and any unverified platform.

Native checks are initially local and explicitly reported. They are not a PR
gate until the stability threshold in `docs/quality.md` is met.

## Crash Reporting

Deterministic tests verify local log structure, privacy redaction, correlation
continuity, exception context, and the disabled behavior when no DSN is set.
They do not prove native crash capture or source-map symbolication.

For a production acceptance run:

1. Configure `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, and `SENTRY_PROJECT` for the
   build environment. Configure `SENTRY_AUTH_TOKEN` as an EAS sensitive secret.
2. Create a new native release build; Expo Go is not an acceptance target for
   native crash reporting.
3. In a controlled local-only test change, invoke `reportError` with a synthetic
   exception from a labeled test action. Do not commit the trigger.
4. Confirm Sentry shows the event, its `plantory.correlation_id`, the preceding
   Plantory breadcrumbs, application version, and a symbolicated application
   stack frame.
5. Remove the local test trigger and record the build, device, event reference,
   result, and any unverified platform in delivery evidence.

Never use real plant names, notes, photos, credentials, or other user content in
an observability test event.

## Quality Trend Verification

Run the offline metric fixture from the repository root:

```powershell
pnpm test:quality-trends
node scripts/quality/quality-trends.mjs --fixture scripts/quality/fixtures/quality-history.json --as-of 2026-08-28T12:00:00.000Z
```

The tests cover first-pass success, failure followed by rerun success, cancelled
runs, failures before unit tests, document review boundaries, invalid governance
records, and escaped-defect lifecycle state. `pnpm check:docs` also verifies that
registered document paths exist and that both quality data files satisfy their
schema.

After the workflows are merged, manually dispatch `Quality Trends`. Acceptance
requires a populated job summary plus matching JSON and Markdown artifacts.
This live check cannot be replaced by the fixture because only GitHub can prove
the private repository's Actions history and token permissions.

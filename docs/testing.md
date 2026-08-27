# Testing And Evidence

## Deterministic Gate

From the repository root run:

```powershell
pnpm harness:check
```

The command checks repository structure, documentation links, architecture,
lint, TypeScript, and Jest tests. It must not require network access after
dependencies are installed.

## Mobile Unit Tests

Plantory uses Jest with the `jest-expo` preset. Keep tests outside `app/` because
Expo Router treats files under `app/` as routes. Prefer state transitions and
business outcomes over implementation snapshots.

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

The default URL is `exp://127.0.0.1:8081/--/`, suitable for an Android emulator
and explicitly targeting the Expo Router root route.
For a physical device, pass the Metro URL reachable from that device:

```powershell
pnpm e2e:android -ExpoUrl exp://<development-host>:8081/--/
```

The wrapper requires `maestro` on `PATH` and at least one online `adb` device.
It writes JUnit, console, debug, screenshot, and command evidence to a UTC run
directory under `.artifacts/`.

On Android systems that do not register Maestro's companion input method, the
wrapper automatically uses staged Maestro flows with `adb shell input text` for
the two ASCII test values. Navigation, actions, state assertions, and cleanup
remain under Maestro control, and every stage receives its own JUnit report.

Store transient screenshots and logs under `.artifacts/<run-id>/`. The directory
is ignored by Git. A delivery report must identify the device, app build, flow,
result, and any unverified platform.

Native checks are initially local and explicitly reported. They are not a PR
gate until the stability threshold in `docs/quality.md` is met.

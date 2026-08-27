import { spawnSync } from 'node:child_process';
import process from 'node:process';

const pnpmEntry = process.env.npm_execpath;
if (!pnpmEntry) {
  console.error('Expo compatibility check must be run through pnpm.');
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [pnpmEntry, '--filter', 'plantory', 'exec', 'expo', 'install', '--check'],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      CI: '1',
      EXPO_NO_TELEMETRY: '1',
    },
    stdio: 'inherit',
  },
);

if (result.error) {
  console.error(`Failed to run Expo compatibility check: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);

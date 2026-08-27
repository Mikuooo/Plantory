import assert from 'node:assert/strict';

import { analyzeArchitecture } from './architecture-rules.mjs';

const base = [
  { path: 'apps/mobile/app/index.tsx', content: "import { Screen } from '@/components/screen';\nexport default Screen;" },
  { path: 'apps/mobile/components/screen.tsx', content: 'export function Screen() { return null; }' },
  { path: 'apps/mobile/stores/state.ts', content: "import { storage } from '@/storage/state';\nexport const state = storage;" },
  { path: 'apps/mobile/storage/state.ts', content: "import SQLite from 'expo-sqlite/kv-store';\nexport const storage = SQLite;" },
];

assert.deepEqual(analyzeArchitecture(base), []);
assert.deepEqual(analyzeArchitecture([
  ...base,
  {
    path: 'apps/mobile/components/__tests__/storage-boundary.test.ts',
    content: [
      "import SQLite from 'expo-sqlite/kv-store';",
      "import { storage } from '@/storage/state';",
      'export const browserStorage = window.localStorage;',
      ...Array(301).fill('const fixtureValue = 1;'),
    ].join('\n'),
  },
]), []);

assertFailure(
  [...base, { path: 'apps/mobile/app/large.tsx', content: Array(151).fill('const value = 1;').join('\n') }],
  'mobile route modules are limited to 150',
);
assertFailure(
  [...base, { path: 'apps/mobile/components/large.tsx', content: Array(301).fill('const value = 1;').join('\n') }],
  'mobile production modules are limited to 300',
);
assertFailure(
  replace(base, 'apps/mobile/app/index.tsx', "import { state } from '@/stores/state';\nexport default state;"),
  'routes must use components or hooks instead of stores or storage',
);
assertFailure(
  replace(base, 'apps/mobile/components/screen.tsx', "import { storage } from '@/storage/state';\nexport const Screen = storage;"),
  'presentation reaches persistence through a store or repository',
);
assertFailure(
  replace(base, 'apps/mobile/stores/state.ts', "import { Screen } from '@/components/screen';\nexport const state = Screen;"),
  'stores cannot depend on presentation layers',
);
assertFailure(
  replace(base, 'apps/mobile/storage/state.ts', "import { state } from '@/stores/state';\nexport const storage = state;"),
  'storage adapters cannot depend on presentation or stores',
);
assertFailure(
  replace(base, 'apps/mobile/components/screen.tsx', "import SQLite from 'expo-sqlite/kv-store';\nexport const Screen = SQLite;"),
  'concrete persistence SDKs belong in apps/mobile/storage',
);
assertFailure(
  replace(base, 'apps/mobile/components/screen.tsx', 'export const Screen = window.localStorage;'),
  'accesses localStorage',
);
assertFailure([
  ...base,
  { path: 'apps/mobile/app/private.ts', content: 'export const routeValue = 1;' },
  { path: 'apps/mobile/components/reverse.ts', content: "export { routeValue } from '@/app/private';" },
], 'mobile layers cannot depend back on route modules');
assertFailure([
  ...base,
  { path: 'packages/domain/index.ts', content: "export { Screen } from '../../apps/mobile/components/screen';" },
], 'shared packages cannot depend on apps or services');
assertFailure([
  ...base,
  { path: 'services/api/index.ts', content: "export { Screen } from '../../apps/mobile/components/screen';" },
], 'services cannot depend on applications');
assertFailure([
  { path: 'apps/mobile/components/first.ts', content: "export { second } from './second';" },
  { path: 'apps/mobile/components/second.ts', content: "export { first } from './first';" },
], 'Circular source dependency');

console.log('Architecture rule tests passed.');

function replace(records, path, content) {
  return records.map((record) => record.path === path ? { path, content } : record);
}

function assertFailure(records, expected) {
  const failures = analyzeArchitecture(records);
  assert.ok(
    failures.some((failure) => failure.includes(expected)),
    `Expected a failure containing "${expected}", received:\n${failures.join('\n')}`,
  );
}

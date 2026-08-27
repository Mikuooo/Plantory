import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

import { analyzeArchitecture, sourceExtensions } from './architecture-rules.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const files = ['apps', 'packages', 'services']
  .flatMap((part) => walk(join(root, part)))
  .filter((file) => sourceExtensions.includes(extname(file)));
const records = files.map((file) => ({
  path: relative(root, file).replaceAll('\\', '/'),
  content: readFileSync(file, 'utf8'),
}));
const failures = analyzeArchitecture(records);

if (failures.length) {
  console.error('Architecture checks failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Architecture checks passed for ${files.length} source files.`);

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

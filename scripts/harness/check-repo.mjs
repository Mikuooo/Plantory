import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const failures = [];
const required = [
  'AGENTS.md',
  'ARCHITECTURE.md',
  '.github/CODEOWNERS',
  'apps/mobile/AGENTS.md',
  'docs/AGENTS.md',
  'packages/AGENTS.md',
  'services/AGENTS.md',
];
for (const relativePath of required) {
  if (!existsSync(join(root, relativePath))) failures.push(`Missing repository guide: ${relativePath}`);
}

const codeownersPath = join(root, '.github/CODEOWNERS');
if (existsSync(codeownersPath)) {
  const ownerPattern = /^@[A-Za-z0-9][A-Za-z0-9-]*(?:\/[A-Za-z0-9_.-]+)?$/;
  const rules = readFileSync(codeownersPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(/\s+/));
  if (!rules.some(([pattern, ...owners]) => pattern === '*' && owners.length > 0)) {
    failures.push('.github/CODEOWNERS must define a default * owner rule.');
  }
  for (const [pattern, ...owners] of rules) {
    if (!pattern || owners.length === 0 || owners.some((owner) => !ownerPattern.test(owner))) {
      failures.push(`Invalid CODEOWNERS rule: ${[pattern, ...owners].join(' ')}`);
    }
  }
}

const cssModuleTypesPath = join(root, 'apps/mobile/css-modules.d.ts');
if (!existsSync(cssModuleTypesPath)) {
  failures.push('Missing CSS Modules declaration: apps/mobile/css-modules.d.ts');
} else {
  const cssModuleTypes = readFileSync(cssModuleTypesPath, 'utf8');
  if (!/declare\s+module\s+['"]\*\.module\.css['"]/.test(cssModuleTypes)) {
    failures.push('apps/mobile/css-modules.d.ts must declare the *.module.css module pattern.');
  }
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const mobilePackageJson = JSON.parse(readFileSync(join(root, 'apps/mobile/package.json'), 'utf8'));
if (packageJson.name === mobilePackageJson.name) {
  failures.push('Root and mobile package names must be unique so pnpm filters cannot recurse.');
}
for (const script of ['check:repo', 'check:docs', 'check:architecture', 'lint', 'typecheck', 'test', 'harness:check']) {
  if (!packageJson.scripts?.[script]) failures.push(`Root package.json is missing script: ${script}`);
}

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const forbidden = tracked.filter((path) => (
  path === '.env'
  || /^\.env\.(?!example$)/.test(path)
  || path.startsWith('.artifacts/')
  || path.includes('/coverage/')
  || path.startsWith('coverage/')
  || path.endsWith('.log')
));
if (forbidden.length) failures.push(`Generated or sensitive files are tracked: ${forbidden.join(', ')}`);

if (failures.length) {
  console.error('Repository checks failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Repository checks passed; inspected ${tracked.length} tracked files.`);

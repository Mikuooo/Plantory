import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { validateDefectLedger, validateDocumentRegistry } from '../quality/quality-trends.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const docs = ['AGENTS.md', 'ARCHITECTURE.md', ...walk(join(root, 'docs'))
  .filter((file) => extname(file) === '.md')
  .map((file) => relative(root, file))];
const failures = [];
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;

for (const relativePath of docs) {
  const absolutePath = join(root, relativePath);
  const content = readFileSync(absolutePath, 'utf8');

  if (!content.trimStart().startsWith('# ')) {
    failures.push(`${relativePath}: Markdown file must start with one H1 heading.`);
  }

  for (const match of content.matchAll(linkPattern)) {
    const target = match[1].trim().replace(/^<|>$/g, '').split('#', 1)[0];
    if (!target || /^(https?:|mailto:)/i.test(target)) continue;

    const decodedTarget = decodeURIComponent(target);
    const candidate = resolve(dirname(absolutePath), decodedTarget);
    const exists = existsSync(candidate)
      && (!statSync(candidate).isDirectory() || existsSync(join(candidate, 'README.md')));
    if (!exists) failures.push(`${relativePath}: broken relative link ${target}`);
  }
}

const requiredKnowledge = [
  'ARCHITECTURE.md',
  'docs/core-beliefs.md',
  'docs/quality.md',
  'docs/quality-trends.md',
  'docs/testing.md',
  'docs/design-docs/index.md',
  'docs/exec-plans/README.md',
];
for (const relativePath of requiredKnowledge) {
  if (!existsSync(join(root, relativePath))) failures.push(`Missing knowledge file: ${relativePath}`);
}

try {
  const registry = JSON.parse(readFileSync(join(root, 'docs/quality/document-freshness.json'), 'utf8'));
  validateDocumentRegistry(registry);
  for (const document of registry.documents) {
    if (!existsSync(join(root, document.path))) failures.push(`Freshness registry references missing document: ${document.path}`);
  }
  const defects = JSON.parse(readFileSync(join(root, 'docs/quality/escaped-defects.json'), 'utf8'));
  validateDefectLedger(defects);
} catch (error) {
  failures.push(`Invalid quality governance data: ${error.message}`);
}

if (failures.length) {
  console.error('Documentation checks failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Documentation checks passed for ${docs.length} Markdown files.`);

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

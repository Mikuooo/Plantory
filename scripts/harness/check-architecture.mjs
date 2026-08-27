import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..', '..');
const sourceRoots = ['apps', 'packages', 'services'];
const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const files = sourceRoots.flatMap((part) => walk(join(root, part)))
  .filter((file) => extensions.includes(extname(file)));
const fileSet = new Set(files.map(normalize));
const graph = new Map();
const failures = [];

for (const file of files) {
  const normalizedFile = normalize(file);
  const imported = ts.preProcessFile(readFileSync(file, 'utf8'), true, true).importedFiles;
  const dependencies = [];

  for (const item of imported) {
    const dependency = resolveImport(file, item.fileName);
    if (!dependency) continue;
    dependencies.push(dependency);
    checkBoundary(normalizedFile, dependency, item.fileName);
  }
  graph.set(normalizedFile, dependencies);
}

const visited = new Set();
const visiting = new Set();
const stack = [];
for (const file of graph.keys()) visit(file);

if (failures.length) {
  console.error('Architecture checks failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Architecture checks passed for ${files.length} source files.`);

function checkBoundary(from, to, specifier) {
  const fromPath = relative(root, from).split(sep).join('/');
  const toPath = relative(root, to).split(sep).join('/');
  if (fromPath.startsWith('packages/') && (toPath.startsWith('apps/') || toPath.startsWith('services/'))) {
    failures.push(`${fromPath} imports ${specifier}; shared packages cannot depend on apps or services.`);
  }
  if (fromPath.startsWith('services/') && toPath.startsWith('apps/')) {
    failures.push(`${fromPath} imports ${specifier}; services cannot depend on applications.`);
  }
  if (fromPath.startsWith('apps/mobile/app/') && toPath.startsWith('apps/mobile/storage/')) {
    failures.push(`${fromPath} imports ${specifier}; routes must reach persistence through a store or repository.`);
  }
}

function visit(file) {
  if (visited.has(file)) return;
  if (visiting.has(file)) {
    const start = stack.indexOf(file);
    const cycle = [...stack.slice(start), file].map((item) => relative(root, item).split(sep).join('/'));
    failures.push(`Circular source dependency: ${cycle.join(' -> ')}`);
    return;
  }

  visiting.add(file);
  stack.push(file);
  for (const dependency of graph.get(file) ?? []) visit(dependency);
  stack.pop();
  visiting.delete(file);
  visited.add(file);
}

function resolveImport(fromFile, specifier) {
  let base;
  if (specifier.startsWith('@/') && normalize(fromFile).includes('/apps/mobile/')) {
    base = join(root, 'apps', 'mobile', specifier.slice(2));
  } else if (specifier.startsWith('.')) {
    base = resolve(dirname(fromFile), specifier);
  } else {
    return null;
  }

  const candidates = [base, ...extensions.map((extension) => `${base}${extension}`),
    ...extensions.map((extension) => join(base, `index${extension}`))];
  const found = candidates.find((candidate) => fileSet.has(normalize(candidate)));
  return found ? normalize(found) : null;
}

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function normalize(path) {
  return resolve(path).replaceAll('\\', '/');
}

import { posix } from 'node:path';
import ts from 'typescript';

export const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

const mobileProductionRoots = [
  'apps/mobile/app/',
  'apps/mobile/components/',
  'apps/mobile/hooks/',
  'apps/mobile/stores/',
  'apps/mobile/storage/',
  'apps/mobile/observability/',
];
const persistencePackages = [
  '@react-native-async-storage/async-storage',
  'expo-secure-store',
  'expo-sqlite',
];

export function analyzeArchitecture(records, { routeMaxLines = 150, productionMaxLines = 300 } = {}) {
  const sources = records.map(({ path, content }) => ({ path: normalizePath(path), content }));
  const fileSet = new Set(sources.map(({ path }) => path));
  const graph = new Map();
  const failures = [];

  for (const source of sources) {
    checkComplexity(source, failures, { routeMaxLines, productionMaxLines });
    checkGlobalPersistenceBoundary(source, failures);
    const imported = ts.preProcessFile(source.content, true, true).importedFiles;
    const dependencies = [];

    for (const item of imported) {
      checkExternalBoundary(source.path, item.fileName, failures);
      const dependency = resolveImport(source.path, item.fileName, fileSet);
      if (!dependency) continue;
      dependencies.push(dependency);
      checkLocalBoundary(source.path, dependency, item.fileName, failures);
    }
    graph.set(source.path, dependencies);
  }

  checkCycles(graph, failures);
  return failures;
}

function checkComplexity({ path, content }, failures, { routeMaxLines, productionMaxLines }) {
  if (!isMobileProductionTypeScript(path)) return;
  const lineCount = content.split(/\r?\n/).length;
  const limit = path.startsWith('apps/mobile/app/') ? routeMaxLines : productionMaxLines;
  if (lineCount > limit) {
    failures.push(`${path} has ${lineCount} lines; mobile ${path.startsWith('apps/mobile/app/') ? 'route' : 'production'} modules are limited to ${limit}.`);
  }
}

function checkGlobalPersistenceBoundary({ path, content }, failures) {
  if (!path.startsWith('apps/mobile/') || isTestFile(path) || path.startsWith('apps/mobile/storage/')) return;
  if (/\b(?:window\.)?localStorage\b/.test(content)) {
    failures.push(`${path} accesses localStorage; concrete persistence APIs belong in apps/mobile/storage/.`);
  }
}

function checkExternalBoundary(from, specifier, failures) {
  const isPersistencePackage = persistencePackages.some((name) => (
    specifier === name || specifier.startsWith(`${name}/`)
  ));
  if (isPersistencePackage
      && from.startsWith('apps/mobile/')
      && !isTestFile(from)
      && !from.startsWith('apps/mobile/storage/')) {
    failures.push(`${from} imports ${specifier}; concrete persistence SDKs belong in apps/mobile/storage/.`);
  }
}

function checkLocalBoundary(from, to, specifier, failures) {
  if (from.startsWith('apps/mobile/') && isTestFile(from)) return;
  if (from.startsWith('packages/') && (to.startsWith('apps/') || to.startsWith('services/'))) {
    failures.push(`${from} imports ${specifier}; shared packages cannot depend on apps or services.`);
  }
  if (from.startsWith('services/') && to.startsWith('apps/')) {
    failures.push(`${from} imports ${specifier}; services cannot depend on applications.`);
  }
  if (from.startsWith('apps/mobile/app/')
      && (to.startsWith('apps/mobile/stores/') || to.startsWith('apps/mobile/storage/'))) {
    failures.push(`${from} imports ${specifier}; routes must use components or hooks instead of stores or storage.`);
  }
  if ((from.startsWith('apps/mobile/components/') || from.startsWith('apps/mobile/hooks/'))
      && to.startsWith('apps/mobile/storage/')) {
    failures.push(`${from} imports ${specifier}; presentation reaches persistence through a store or repository.`);
  }
  if (from.startsWith('apps/mobile/stores/')
      && isWithinAny(to, ['apps/mobile/app/', 'apps/mobile/components/', 'apps/mobile/hooks/'])) {
    failures.push(`${from} imports ${specifier}; stores cannot depend on presentation layers.`);
  }
  if (from.startsWith('apps/mobile/storage/')
      && isWithinAny(to, ['apps/mobile/app/', 'apps/mobile/components/', 'apps/mobile/hooks/', 'apps/mobile/stores/'])) {
    failures.push(`${from} imports ${specifier}; storage adapters cannot depend on presentation or stores.`);
  }
  if (!from.startsWith('apps/mobile/app/')
      && from.startsWith('apps/mobile/')
      && to.startsWith('apps/mobile/app/')) {
    failures.push(`${from} imports ${specifier}; mobile layers cannot depend back on route modules.`);
  }
}

function checkCycles(graph, failures) {
  const visited = new Set();
  const visiting = new Set();
  const stack = [];

  const visit = (file) => {
    if (visited.has(file)) return;
    if (visiting.has(file)) {
      const start = stack.indexOf(file);
      failures.push(`Circular source dependency: ${[...stack.slice(start), file].join(' -> ')}`);
      return;
    }
    visiting.add(file);
    stack.push(file);
    for (const dependency of graph.get(file) ?? []) visit(dependency);
    stack.pop();
    visiting.delete(file);
    visited.add(file);
  };

  for (const file of graph.keys()) visit(file);
}

function resolveImport(from, specifier, fileSet) {
  let base;
  if (specifier.startsWith('@/') && from.startsWith('apps/mobile/')) {
    base = posix.join('apps/mobile', specifier.slice(2));
  } else if (specifier.startsWith('.')) {
    base = posix.normalize(posix.join(posix.dirname(from), specifier));
  } else {
    return null;
  }

  const candidates = [
    base,
    ...sourceExtensions.map((extension) => `${base}${extension}`),
    ...sourceExtensions.map((extension) => posix.join(base, `index${extension}`)),
  ];
  return candidates.find((candidate) => fileSet.has(candidate)) ?? null;
}

function isMobileProductionTypeScript(path) {
  return (path.endsWith('.ts') || path.endsWith('.tsx'))
    && !path.endsWith('.d.ts')
    && !isTestFile(path)
    && isWithinAny(path, mobileProductionRoots);
}

function isTestFile(path) {
  return path.includes('/__tests__/') || path.includes('.test.');
}

function isWithinAny(path, roots) {
  return roots.some((root) => path.startsWith(root));
}

function normalizePath(path) {
  return path.replaceAll('\\', '/').replace(/^\.\//, '');
}

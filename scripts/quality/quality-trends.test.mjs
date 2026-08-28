import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildQualityTrends, renderMarkdown, validateDefectLedger, validateDocumentRegistry } from './quality-trends.mjs';

const fixture = JSON.parse(await readFile(new URL('./fixtures/quality-history.json', import.meta.url), 'utf8'));

const registry = {
  schemaVersion: 1,
  documents: [
    { path: 'fresh.md', owner: '@plantory/engineering', maxAgeDays: 30, reviews: ['2026-08-20'] },
    { path: 'stale.md', owner: '@plantory/engineering', maxAgeDays: 10, reviews: ['2026-07-01'] },
  ],
};
const defects = {
  schemaVersion: 1,
  defects: [
    { id: 'ESC-1', detectedAt: '2026-08-18', severity: 'S2', status: 'open', source: 'issue:1' },
    { id: 'ESC-2', detectedAt: '2026-08-25', severity: 'S4', status: 'closed', resolvedAt: '2026-08-27', source: 'issue:2' },
  ],
};

test('computes first-pass, rerun flake, freshness, and escaped defect metrics', () => {
  const report = buildQualityTrends({
    runs: fixture.runs,
    documentRegistry: registry,
    defectLedger: defects,
    asOf: '2026-08-28T12:00:00.000Z',
    weeks: 4,
  });

  assert.deepEqual(report.current.ciFirstPass, { eligible: 5, passed: 1, rate: 0.2 });
  assert.deepEqual(report.current.testFlake, { eligible: 4, flaky: 1, rate: 0.25 });
  assert.deepEqual(report.current.documentStaleness, {
    tracked: 2,
    overdue: 1,
    overdueRate: 0.5,
    p90OverdueDays: 48,
    maxOverdueDays: 48,
  });
  assert.equal(report.current.escapedDefects.detected, 2);
  assert.equal(report.current.escapedDefects.open, 1);
  assert.deepEqual(report.current.escapedDefects.severity, { S1: 0, S2: 1, S3: 0, S4: 1 });
});

test('keeps cancelled runs and non-test failures out of metric denominators', () => {
  const report = buildQualityTrends({
    runs: fixture.runs,
    documentRegistry: { schemaVersion: 1, documents: [] },
    defectLedger: { schemaVersion: 1, defects: [] },
    asOf: '2026-08-28T12:00:00.000Z',
    weeks: 1,
  });

  assert.equal(report.current.ciFirstPass.eligible, 3);
  assert.equal(report.current.testFlake.eligible, 2);
  assert.equal(report.current.documentStaleness.overdueRate, null);
});

test('uses review history to reproduce an earlier document state', () => {
  const historicalRegistry = {
    schemaVersion: 1,
    documents: [{
      path: 'contract.md',
      owner: '@plantory/engineering',
      maxAgeDays: 30,
      reviews: ['2026-01-01', '2026-08-20'],
    }],
  };
  const report = buildQualityTrends({
    runs: [],
    documentRegistry: historicalRegistry,
    defectLedger: { schemaVersion: 1, defects: [] },
    asOf: '2026-08-21T12:00:00.000Z',
    weeks: 2,
  });

  assert.equal(report.weeks[0].documentStaleness.overdue, 1);
  assert.equal(report.current.documentStaleness.overdue, 0);
});

test('does not mark a document overdue on its exact review boundary', () => {
  const report = buildQualityTrends({
    runs: [],
    documentRegistry: {
      schemaVersion: 1,
      documents: [{ path: 'boundary.md', owner: '@plantory/engineering', maxAgeDays: 30, reviews: ['2026-07-29'] }],
    },
    defectLedger: { schemaVersion: 1, defects: [] },
    asOf: '2026-08-28T00:00:00.000Z',
    weeks: 1,
  });

  assert.equal(report.current.documentStaleness.overdue, 0);
  assert.equal(report.current.documentStaleness.maxOverdueDays, 0);
});

test('rejects invalid governance records', () => {
  assert.throws(() => validateDocumentRegistry({
    schemaVersion: 1,
    documents: [{ path: 'a.md', owner: '@plantory/engineering', maxAgeDays: 30, reviews: ['2026-02-30'] }],
  }), /valid date/);
  assert.throws(() => validateDocumentRegistry({
    schemaVersion: 1,
    documents: [{ path: 'a.md', owner: 'engineering', maxAgeDays: 30, reviews: ['2026-08-20'] }],
  }), /GitHub user or team handle/);
  assert.throws(() => validateDefectLedger({
    schemaVersion: 1,
    defects: [{ id: 'ESC-1', detectedAt: '2026-08-20', severity: 'S5', status: 'open', source: 'issue:1' }],
  }), /invalid severity/);
});

test('renders an auditable Markdown summary', () => {
  const report = buildQualityTrends({
    runs: fixture.runs,
    documentRegistry: registry,
    defectLedger: defects,
    asOf: '2026-08-28T12:00:00.000Z',
    weeks: 1,
  });
  const markdown = renderMarkdown(report);
  assert.match(markdown, /CI first-pass rate \| 0\.0%/);
  assert.match(markdown, /Test flake rate \| 0\.0%/);
  assert.match(markdown, /max 48 days/);
  assert.match(markdown, /S2: 0/);
  assert.match(markdown, /2026-08-24/);
});

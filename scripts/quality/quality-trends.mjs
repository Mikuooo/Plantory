import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DAY_MS = 24 * 60 * 60 * 1000;
const ELIGIBLE_CONCLUSIONS = new Set([
  'action_required',
  'failure',
  'startup_failure',
  'success',
  'timed_out',
]);
const TEST_CONCLUSIONS = new Set(['failure', 'success']);
const TEST_STEP_NAME = 'Unit tests';

export function buildQualityTrends({ runs, documentRegistry, defectLedger, asOf, weeks = 12 }) {
  const asOfDate = parseTimestamp(asOf, 'asOf');
  validateDocumentRegistry(documentRegistry);
  validateDefectLedger(defectLedger);
  const buckets = buildWeekBuckets(asOfDate, weeks);
  const windowRuns = runs.filter((run) => {
    const createdAt = parseTimestamp(run.createdAt, 'run.createdAt');
    return ['pull_request', 'push'].includes(run.event) && createdAt >= buckets[0].start && createdAt <= asOfDate;
  });

  return {
    schemaVersion: 1,
    generatedAt: asOfDate.toISOString(),
    window: {
      weeks,
      start: dateOnly(buckets[0].start),
      end: dateOnly(asOfDate),
    },
    current: {
      ciFirstPass: computeCi(windowRuns),
      testFlake: computeTestFlake(windowRuns),
      documentStaleness: computeDocumentStaleness(documentRegistry, asOfDate),
      escapedDefects: computeEscapedDefects(defectLedger, asOfDate, buckets[0].start),
    },
    weeks: buckets.map((bucket) => {
      const bucketRuns = windowRuns.filter((run) => inRange(parseTimestamp(run.createdAt, 'run.createdAt'), bucket));
      const bucketAsOf = bucket.end < asOfDate ? bucket.end : asOfDate;
      return {
        weekStart: dateOnly(bucket.start),
        ciFirstPass: computeCi(bucketRuns),
        testFlake: computeTestFlake(bucketRuns),
        documentStaleness: computeDocumentStaleness(documentRegistry, bucketAsOf),
        escapedDefects: computeEscapedDefects(defectLedger, bucketAsOf, bucket.start, bucket.end),
      };
    }),
  };
}

export function validateDocumentRegistry(registry) {
  if (registry?.schemaVersion !== 1 || !Array.isArray(registry.documents)) {
    throw new Error('Document freshness registry must use schemaVersion 1 and contain documents.');
  }

  const paths = new Set();
  for (const document of registry.documents) {
    if (!document.path || paths.has(document.path)) {
      throw new Error(`Document paths must be non-empty and unique: ${document.path ?? '<missing>'}`);
    }
    paths.add(document.path);
    if (!document.owner || !Number.isInteger(document.maxAgeDays) || document.maxAgeDays < 1) {
      throw new Error(`Document ${document.path} needs an owner and a positive integer maxAgeDays.`);
    }
    if (!Array.isArray(document.reviews) || document.reviews.length === 0) {
      throw new Error(`Document ${document.path} needs at least one review date.`);
    }
    let previous = '';
    for (const review of document.reviews) {
      parseDate(review, `${document.path} review`);
      if (review <= previous) throw new Error(`Review dates for ${document.path} must be unique and ascending.`);
      previous = review;
    }
  }
}

export function validateDefectLedger(ledger) {
  if (ledger?.schemaVersion !== 1 || !Array.isArray(ledger.defects)) {
    throw new Error('Escaped defect ledger must use schemaVersion 1 and contain defects.');
  }

  const ids = new Set();
  for (const defect of ledger.defects) {
    if (!defect.id || ids.has(defect.id)) throw new Error(`Defect IDs must be non-empty and unique: ${defect.id ?? '<missing>'}`);
    ids.add(defect.id);
    parseDate(defect.detectedAt, `${defect.id} detectedAt`);
    if (!['S1', 'S2', 'S3', 'S4'].includes(defect.severity)) {
      throw new Error(`Defect ${defect.id} has invalid severity ${defect.severity}.`);
    }
    if (!['open', 'closed'].includes(defect.status) || !defect.source) {
      throw new Error(`Defect ${defect.id} needs a valid status and source.`);
    }
    if (defect.status === 'closed') {
      parseDate(defect.resolvedAt, `${defect.id} resolvedAt`);
      if (defect.resolvedAt < defect.detectedAt) throw new Error(`Defect ${defect.id} resolves before detection.`);
    } else if (defect.resolvedAt) {
      throw new Error(`Open defect ${defect.id} cannot have resolvedAt.`);
    }
  }
}

export function renderMarkdown(report) {
  const { current } = report;
  const lines = [
    '# Quality Trends',
    '',
    `Generated at ${report.generatedAt} for ${report.window.start} through ${report.window.end}.`,
    '',
    '## Current Window',
    '',
    '| Metric | Result | Evidence |',
    '| --- | ---: | --- |',
    `| CI first-pass rate | ${formatRate(current.ciFirstPass.rate)} | ${current.ciFirstPass.passed}/${current.ciFirstPass.eligible} eligible runs |`,
    `| Test flake rate | ${formatRate(current.testFlake.rate)} | ${current.testFlake.flaky}/${current.testFlake.eligible} first-attempt test executions |`,
    `| Document overdue rate | ${formatRate(current.documentStaleness.overdueRate)} | ${current.documentStaleness.overdue}/${current.documentStaleness.tracked}; P90 ${current.documentStaleness.p90OverdueDays} days; max ${current.documentStaleness.maxOverdueDays} days |`,
    `| Escaped defects | ${current.escapedDefects.detected} | ${current.escapedDefects.open} open; ${formatSeverity(current.escapedDefects.severity)} |`,
    '',
    '## Weekly Trend',
    '',
    '| Week | CI first pass | Test flake | Docs overdue | Escaped defects |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...report.weeks.map((week) => (
      `| ${week.weekStart} | ${formatRate(week.ciFirstPass.rate)} | ${formatRate(week.testFlake.rate)} | ${formatRate(week.documentStaleness.overdueRate)} | ${week.escapedDefects.detected} |`
    )),
    '',
    'Cancelled or skipped workflow attempts are excluded. A test flake requires a failed `Unit tests` step followed by a successful rerun of the same workflow run and commit.',
    '',
  ];
  return lines.join('\n');
}

function computeCi(runs) {
  const eligible = runs.filter((run) => ELIGIBLE_CONCLUSIONS.has(run.firstAttempt?.conclusion));
  const passed = eligible.filter((run) => run.firstAttempt.conclusion === 'success').length;
  return { eligible: eligible.length, passed, rate: ratio(passed, eligible.length) };
}

function computeTestFlake(runs) {
  const eligibleRuns = runs.filter((run) => TEST_CONCLUSIONS.has(findTestConclusion(run.firstAttempt)));
  const flaky = eligibleRuns.filter((run) => (
    findTestConclusion(run.firstAttempt) === 'failure'
    && (run.laterAttempts ?? []).some((attempt) => findTestConclusion(attempt) === 'success')
  )).length;
  return { eligible: eligibleRuns.length, flaky, rate: ratio(flaky, eligibleRuns.length) };
}

function computeDocumentStaleness(registry, asOf) {
  const values = registry.documents.flatMap((document) => {
    const review = [...document.reviews].reverse().find((value) => parseDate(value, 'review') <= asOf);
    if (!review) return [];
    const ageDays = Math.max(0, Math.floor((endOfDay(asOf) - parseDate(review, 'review')) / DAY_MS));
    return [Math.max(0, ageDays - document.maxAgeDays)];
  });
  const overdue = values.filter((value) => value > 0).length;
  return {
    tracked: values.length,
    overdue,
    overdueRate: ratio(overdue, values.length),
    p90OverdueDays: percentile(values, 0.9),
    maxOverdueDays: values.length ? Math.max(...values) : 0,
  };
}

function computeEscapedDefects(ledger, asOf, start, end = asOf) {
  const defects = ledger.defects.filter((defect) => {
    const detected = parseDate(defect.detectedAt, 'detectedAt');
    return detected >= start && detected <= end && detected <= asOf;
  });
  const severity = Object.fromEntries(['S1', 'S2', 'S3', 'S4'].map((level) => [level, 0]));
  for (const defect of defects) severity[defect.severity] += 1;
  const open = defects.filter((defect) => defect.status === 'open' || parseDate(defect.resolvedAt, 'resolvedAt') > asOf).length;
  return { detected: defects.length, open, severity };
}

function findTestConclusion(attempt) {
  for (const job of attempt?.jobs ?? []) {
    const step = (job.steps ?? []).find((candidate) => candidate.name === TEST_STEP_NAME);
    if (step) return step.conclusion;
  }
  return undefined;
}

function buildWeekBuckets(asOf, count) {
  if (!Number.isInteger(count) || count < 1) throw new Error('weeks must be a positive integer.');
  const currentStart = startOfIsoWeek(asOf);
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(currentStart.getTime() - (count - index - 1) * 7 * DAY_MS);
    return { start, end: new Date(start.getTime() + 7 * DAY_MS - 1) };
  });
}

function startOfIsoWeek(value) {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date;
}

function inRange(value, { start, end }) {
  return value >= start && value <= end;
}

function percentile(values, percentileValue) {
  if (!values.length) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.max(0, Math.ceil(ordered.length * percentileValue) - 1)];
}

function ratio(numerator, denominator) {
  return denominator === 0 ? null : Math.round((numerator / denominator) * 1000) / 1000;
}

function formatRate(value) {
  return value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`;
}

function formatSeverity(severity) {
  return Object.entries(severity).map(([level, count]) => `${level}: ${count}`).join(', ');
}

function parseDate(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be YYYY-MM-DD.`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || dateOnly(date) !== value) throw new Error(`${label} is not a valid date.`);
  return date;
}

function parseTimestamp(value, label) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} must be a valid timestamp.`);
  return date;
}

function endOfDay(value) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 23, 59, 59, 999));
}

function dateOnly(value) {
  return value.toISOString().slice(0, 10);
}

async function loadGitHubRuns({ repository, token, since }) {
  if (!repository || !token) throw new Error('Set GITHUB_REPOSITORY and GITHUB_TOKEN, or pass --fixture for offline generation.');
  const api = new GitHubApi(repository, token);
  const workflowRuns = await api.listRuns(since);
  return Promise.all(workflowRuns.map(async (run) => {
    const firstRun = run.run_attempt === 1 ? run : await api.getRunAttempt(run.id, 1);
    const firstJobs = await api.getAttemptJobs(run.id, 1);
    const laterAttempts = [];
    for (let attempt = 2; attempt <= run.run_attempt; attempt += 1) {
      laterAttempts.push({ attempt, jobs: await api.getAttemptJobs(run.id, attempt) });
    }
    return {
      id: run.id,
      event: run.event,
      headSha: run.head_sha,
      createdAt: firstRun.created_at,
      firstAttempt: { attempt: 1, conclusion: firstRun.conclusion, jobs: firstJobs },
      laterAttempts,
    };
  }));
}

class GitHubApi {
  constructor(repository, token) {
    this.base = `https://api.github.com/repos/${repository}`;
    this.headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  async listRuns(since) {
    const runs = [];
    for (let page = 1; ; page += 1) {
      const query = new URLSearchParams({ per_page: '100', page: String(page) });
      const response = await this.get(`/actions/workflows/quality.yml/runs?${query}`);
      const pageRuns = response.workflow_runs.filter((run) => (
        ['pull_request', 'push'].includes(run.event) && new Date(run.created_at) >= since
      ));
      runs.push(...pageRuns);
      const oldestRun = response.workflow_runs.at(-1);
      if (response.workflow_runs.length < 100 || (oldestRun && new Date(oldestRun.created_at) < since)) break;
    }
    return runs;
  }

  getRunAttempt(runId, attempt) {
    return this.get(`/actions/runs/${runId}/attempts/${attempt}`);
  }

  async getAttemptJobs(runId, attempt) {
    const response = await this.get(`/actions/runs/${runId}/attempts/${attempt}/jobs?per_page=100`);
    return response.jobs.map((job) => ({
      name: job.name,
      conclusion: job.conclusion,
      steps: (job.steps ?? []).map((step) => ({ name: step.name, conclusion: step.conclusion })),
    }));
  }

  async get(path) {
    const response = await fetch(`${this.base}${path}`, { headers: this.headers });
    if (!response.ok) throw new Error(`GitHub API ${response.status} for ${path}.`);
    return response.json();
  }
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--') || !argv[index + 1]) throw new Error(`Expected a value after ${key}.`);
    args[key.slice(2)] = argv[index + 1];
    index += 1;
  }
  return args;
}

async function main() {
  const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
  const args = parseArgs(process.argv.slice(2));
  const asOf = args['as-of'] ?? new Date().toISOString();
  const weeks = Number(args.weeks ?? 12);
  const registryPath = resolve(root, args['document-registry'] ?? 'docs/quality/document-freshness.json');
  const defectsPath = resolve(root, args['defect-ledger'] ?? 'docs/quality/escaped-defects.json');
  const documentRegistry = JSON.parse(await readFile(registryPath, 'utf8'));
  const defectLedger = JSON.parse(await readFile(defectsPath, 'utf8'));
  const since = buildWeekBuckets(parseTimestamp(asOf, 'asOf'), weeks)[0].start;
  const runs = args.fixture
    ? JSON.parse(await readFile(resolve(root, args.fixture), 'utf8')).runs
    : await loadGitHubRuns({
      repository: args.repository ?? process.env.GITHUB_REPOSITORY,
      token: process.env.GITHUB_TOKEN,
      since,
    });
  const report = buildQualityTrends({ runs, documentRegistry, defectLedger, asOf, weeks });
  const jsonPath = resolve(root, args['output-json'] ?? '.artifacts/quality-trends.json');
  const markdownPath = resolve(root, args['output-markdown'] ?? '.artifacts/quality-trends.md');
  await Promise.all([mkdir(dirname(jsonPath), { recursive: true }), mkdir(dirname(markdownPath), { recursive: true })]);
  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`),
    writeFile(markdownPath, renderMarkdown(report)),
  ]);
  console.log(`Quality trends written to ${jsonPath} and ${markdownPath}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

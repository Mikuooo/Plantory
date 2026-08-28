# Quality Trends

Plantory publishes a rolling 12-week quality report from the `Quality Trends`
GitHub Actions workflow every Monday and on manual dispatch. The workflow writes
the current Markdown report to its job summary and retains the Markdown and JSON
evidence as an artifact for 90 days.

## Metrics

### CI First-Pass Rate

The denominator is completed, non-cancelled first attempts of the `Quality`
workflow for pull requests and pushes to the default branch. The numerator is
the subset whose first attempt succeeded. A successful rerun does not change an
initial failure into a first-pass success.

### Test Flake Rate

The denominator is first attempts where the named `Unit tests` step completed
with success or failure. A run is flaky only when that step fails and a later
attempt of the same workflow run and commit succeeds. Failures in checkout,
dependency installation, lint, type checking, or another gate do not count as
test flakes. A new commit is a repair, not a rerun recovery.

### Document Staleness

[`quality/document-freshness.json`](./quality/document-freshness.json) registers
the owner, maximum review age, and ascending review history for durable
documents. The report shows the overdue-document ratio, P90 overdue days, and
maximum overdue days. Editing a document does not imply that its contract was
reviewed; append a review date only after comparing it with the implemented
source of truth. Every registry owner must be a GitHub user or team handle that
appears in `.github/CODEOWNERS`.

### Escaped Defects

[`quality/escaped-defects.json`](./quality/escaped-defects.json) records defects
discovered after the responsible change was merged or released. Each record has
a stable ID, detection date, severity (`S1` through `S4`), status, and an issue,
incident, or execution-plan reference in `source`. Closed defects also require
`resolvedAt`. The report groups newly detected defects by week and reports the
currently open count and severity distribution in the rolling window.

Use the following shape when recording a defect:

```json
{
  "id": "ESC-2026-001",
  "detectedAt": "2026-08-28",
  "severity": "S3",
  "status": "open",
  "source": "https://github.com/owner/repository/issues/123"
}
```

Do not record customer data, credentials, private logs, or sensitive incident
details in the ledger.

## Local Verification

Run the deterministic fixture without GitHub access:

```powershell
pnpm test:quality-trends
node scripts/quality/quality-trends.mjs --fixture scripts/quality/fixtures/quality-history.json --as-of 2026-08-28T12:00:00.000Z
```

Live generation requires `GITHUB_REPOSITORY` and a `GITHUB_TOKEN` with read
access to Actions. API or permission failures stop the report rather than
publishing partial metrics.

## Live Acceptance

The scheduled workflow is accepted only after the same default-branch source
has passed the `Quality` workflow and a manual `Quality Trends` dispatch has:

1. completed successfully with read-only `actions` and `contents` permissions;
2. published a non-empty job summary;
3. uploaded matching JSON and Markdown evidence with 90-day retention;
4. reported a non-zero CI first-pass denominator when eligible Quality runs
   exist in the rolling window.

The report is maintained by `@Mikuooo` under the soft-responsibility contract in
[`ownership.md`](./ownership.md). A missing owner response does not convert
missing or inaccessible Actions data into a passing report.

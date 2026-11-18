# Release Gates

A change is ready to merge when the checks in `.github/workflows/ci.yml` pass. The workflow runs on pushes and pull requests to `master` and `main`.

## CI jobs

| Job | Checks |
| --- | --- |
| `backend-tests` | Hash-pinned Python install, full pytest suite, Ruff syntax and undefined-name checks |
| `backend-dependency-audit` | `pip-audit` against `requirements.lock` |
| `ops-console` | Clean install, typecheck, lint, tests, production build, deployed-dependency audit |
| `product-web` | Clean install, tests, production build, bundle budget, deployed-dependency audit |
| `desktop` | Clean install, archive-path tests, Electron runtime check, dependency audit |

The npm applications are installed independently from their per-application lockfiles. The repository root intentionally has no workspace lockfile.

## Local gate

Run the commands in [README.md](../README.md#tests-and-checks) before pushing.

## Deployment blocking

Production is deployed with the `cloudflare:deploy` commands in
[README.md](../README.md#deployment). Run the release from a commit whose CI
run is green. Configure GitHub branch protection to require every CI job before
merging, and keep deployment credentials out of pull-request workflows. A red
CI run must block the release.

Apply any pending Alembic migration before deploying API code that depends on
it. The API's `/health` endpoint compares the live revision with the migration
head packaged in the deployed Worker. The production smoke workflow fails if
the revision is missing, pending, or different from the expected head.

## Dependency advisories

The deployed-set npm audits use `--omit=dev`. Development-only advisories are visible in the non-blocking audit step. A high or critical advisory in code shipped to users blocks the release.

## Release checklist

Before merging:

- All CI jobs pass.
- User-visible behavior changes are documented.
- Security-sensitive changes include regression tests.
- A rollback path is known.
- Any database migration has been tested forward and backward where the migration can be reversed.

After deploying:

- `GET /health` reports `db: ok`, `schema: current`, and matching `revision` and `expected_revision`.
- The product site and operations console load.
- Both frontend origins pass an API CORS preflight. The product site is
  `https://freightpilot.pages.dev`; the console is
  `https://freightpilot-ops.freightpilot.workers.dev`.
- The production smoke workflow passes.
- Runtime logs show no new error spike.

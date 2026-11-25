# Release Gates

A change is ready to merge when the checks in `.github/workflows/ci.yml` pass. The workflow runs on pushes and pull requests to `master` and `main`.

## CI jobs

| Job | Checks |
| --- | --- |
| `backend-tests` | Hash-pinned Python install, full pytest suite, Ruff syntax and undefined-name checks, focused mypy gate |
| `backend-dependency-audit` | `pip-audit` against `requirements.lock` |
| `backend-postgres` | Alembic upgrade, live PostgreSQL schema/UUID checks, PostgreSQL-backed regression tests |
| `worker-dependency-audit` | Worker lockfile audit with `--no-deps` |
| `ops-console` | Clean install, typecheck, lint, tests, production build, deployed-dependency audit |
| `product-web` | Clean install, TypeScript check, tests, production build, bundle budget, deployed-dependency audit |
| `desktop` | Clean install, archive-path tests, Electron runtime check, dependency audit |
| `docker` | Compose configuration validation and production image builds |
| `release-gate` | Aggregates every blocking CI job; fails unless all eight jobs pass |

The npm applications are installed independently from their per-application lockfiles. The repository root intentionally has no workspace lockfile.

## Local gate

Run the commands in [README.md](../README.md#tests-and-checks) before pushing.

## Automatic deployment

`release-gate` must be a required status check on `master`, and `master` must
require a pull request before merging. Pull-request runs never receive
production secrets. A push to `master` deploys only when `release-gate` proves
that all eight CI jobs passed for that exact commit.

The `deploy-production` job then applies pending Alembic migrations, deploys
the API Worker, waits for `/health` to report a current schema, publishes both
Pages projects and the redirect Workers, and invokes
`.github/workflows/production-smoke.yml`. A failed migration, deployment, health
check, or smoke test marks the release failed. Database migrations must remain
forward-compatible and have a reviewed recovery plan because a database schema
change cannot be rolled back atomically with every Cloudflare asset.

The workflow expects `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and
`PRODUCTION_DATABASE_URL` to be configured as repository secrets or secrets on
the `production` GitHub environment. The API's Hyperdrive binding remains the
runtime database connection; `PRODUCTION_DATABASE_URL` is used only by the
migration step.

## Dependency advisories

The deployed-set npm audits use `--omit=dev`. Development-only advisories are visible in the non-blocking audit step. A high or critical advisory in code shipped to users blocks the release.

## Release checklist

Before merging:

- All CI jobs pass.
- User-visible behavior changes are documented.
- Security-sensitive changes include regression tests.
- A rollback path is known.
- Any database migration has been tested forward and backward where the migration can be reversed.

After the automatic deployment:

- `GET /health` reports `db: ok`, `schema: current`, and matching `revision` and `expected_revision`.
- The product site and operations console load.
- Both frontend origins pass an API CORS preflight. The product site is
  `https://freightpilot.pages.dev`; the console is
  `https://freightpilot-ops.pages.dev`.
- The production smoke workflow passes.
- Runtime logs show no new error spike.

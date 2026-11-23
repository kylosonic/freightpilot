# FreightPilot

FreightPilot is a logistics workspace for small and mid-sized transport teams. It combines route planning, shipment and inventory data, dispatch execution, delivery proof, cash reconciliation, alerts, and billing in one system.

The repository contains four applications:

| Path | Purpose |
| --- | --- |
| `apps/platform-api` | FastAPI, SQLAlchemy, and Alembic service |
| `apps/ops-console` | React operations console for planners, dispatchers, and administrators |
| `apps/product-web` | Next.js product site and company signup |
| `apps/desktop` | Electron wrapper for the operations console |

The backend owns authentication, organization membership, tenant scoping, and operational data. The public site can create a company workspace, which starts with sample data so a new team can try route planning before importing its own CSVs.

## Local stack

### Requirements

- Docker with Compose
- Python 3.12 for backend work outside Docker
- Node.js 22 or newer for the web applications

### Start with Docker

Copy the environment template and edit the copied file:

```powershell
Copy-Item .env.example .env
```

Generate a separate value for each secret:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Set the generated values for `POSTGRES_PASSWORD`, `JWT_SECRET_KEY`, and `PROVIDER_KEY_ENCRYPTION_SECRET`. For a local demo, also set:

```dotenv
APP_ENV=development
```

Then build and start the services:

```powershell
docker compose up --build
```

The default addresses are:

- Operations console: `http://localhost`
- Product site: `http://localhost:8081`
- API: `http://localhost:8000`
- API documentation: `http://localhost:8000/docs`
- PostgreSQL: `127.0.0.1:5432`

Check the API and database:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

A healthy response has this shape:

```json
{"status":"ok","db":"ok","schema":"current","revision":"20261122_0027","expected_revision":"20261122_0027"}
```

Stop the stack with:

```powershell
docker compose down
```

### Run applications separately

Install each npm application from its own lockfile:

```powershell
npm --prefix apps/ops-console ci
npm --prefix apps/product-web ci
npm --prefix apps/desktop ci
```

Start the operations console and product site in separate terminals:

```powershell
npm --prefix apps/ops-console run dev
npm --prefix apps/product-web run dev
```

The Vite development server uses `http://localhost:5173`; the product site uses `http://localhost:5174`.

For backend development:

```powershell
Set-Location apps/platform-api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
Copy-Item .env.example .env
python -m alembic upgrade head
python scripts/seed_data.py
uvicorn app.main:app --reload --port 8000
```

Set `DATABASE_URL` in `apps/platform-api/.env` before running migrations. The database must be PostgreSQL when the backend runs outside tests.

Run the desktop shell and check its Electron runtime:

```powershell
npm --prefix apps/desktop run start
npm --prefix apps/desktop run doctor
```

## Example: create a workspace and read its activation state

With the API running locally, create a company workspace:

```bash
curl -sS -c cookies.txt \
  -X POST http://localhost:8000/api/v1/auth/company-signup \
  -H 'Content-Type: application/json' \
  -d '{
    "company_name": "Acme Logistics",
    "company_email": "ops@acme-logistics.example",
    "password": "change-this-password",
    "full_name": "Operations Lead",
    "subscription_tier": "starter"
  }'
```

The response contains the new user and organization. The authentication cookie is stored in `cookies.txt`. Read the seeded workspace's activation state with:

```bash
curl -sS -b cookies.txt http://localhost:8000/api/v1/activation
```

The state reports which sample data categories exist and which onboarding milestones are complete. Upload real CSVs from the operations console when the team is ready to replace the sample rows.

## Configuration

The main backend settings are documented in `apps/platform-api/.env.example`.

- `DATABASE_URL` selects the database.
- `JWT_SECRET_KEY` signs login tokens.
- `PROVIDER_KEY_ENCRYPTION_SECRET` encrypts stored provider API keys.
- `PROVIDER_KEY_ENCRYPTION_PREVIOUS_SECRET` is optional and is used only during a staged provider-key rotation.
- `PLATFORM_ADMIN_EMAILS` is a comma-separated allowlist for platform-review access. It does not grant tenant access by itself.
- `PLATFORM_ADMIN_BOOTSTRAP_ENABLED` is a local-demo shortcut. Keep it `false` in production and use the email allowlist instead.
- `CONSOLE_URL` is the public operations-console origin used in invitation, tracking, and driver links.
- `PROOF_ORG_QUOTA_BYTES` limits delivery-proof storage per workspace.
- `RECEIPT_EXTRACTION_MODE` selects the receipt extraction adapter.
- `SMTP_*` enables invitation email delivery. When SMTP is not configured, the console still returns a copyable invitation link.
- `SMS_GATEWAY_*` configures the generic SMS gateway used for escalation messages.

Production startup rejects missing secrets, known placeholder values, and incomplete collection-account settings.

The product site reads `NEXT_PUBLIC_PLATFORM_API_URL`, `NEXT_PUBLIC_APP_CONSOLE_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_CONTACT_FORM_ENDPOINT`, `NEXT_PUBLIC_DOCS_URL`, `NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL`, and `NEXT_PUBLIC_SITE_URL` from `apps/product-web/.env.example`.

### Rotate a provider encryption key

Stored provider keys use `MultiFernet`, so a rotation can be completed without invalidating existing encrypted rows.

1. Copy the current value into `PROVIDER_KEY_ENCRYPTION_PREVIOUS_SECRET` and deploy that change first.
2. Generate a new value for `PROVIDER_KEY_ENCRYPTION_SECRET` and deploy it while the previous secret remains configured.
3. Run provider-key tests to confirm both old and new ciphertext remain readable.
4. Keep the previous secret until a separate, reviewed data migration has re-encrypted every stored key.

`scripts/rotate_and_deploy.ps1` does not re-encrypt provider keys, and this repository does not yet include an automated re-encryption command. Do not remove `PROVIDER_KEY_ENCRYPTION_PREVIOUS_SECRET` based only on a successful deployment.

## Database migrations

Alembic migrations are the source of truth for the operational schema:

```powershell
Set-Location apps/platform-api
$env:DATABASE_URL = "postgresql+psycopg://user:password@host:5432/database"
python -m alembic upgrade head
```

The current migration head is `20261122_0027`. Migration ordering is checked by `tests/test_migration_chain_integrity.py`.

The Alembic chain is the repository's only schema path. A separate hosted authentication or data API is not part of the running application.

## Tests and checks

Backend:

```powershell
Set-Location apps/platform-api
pytest -q
```

Operations console:

```powershell
npm --prefix apps/ops-console run typecheck
npm --prefix apps/ops-console run lint
npm --prefix apps/ops-console run test
npm --prefix apps/ops-console run build
```

Product site:

```powershell
npm --prefix apps/product-web run test
npm --prefix apps/product-web run build
npm --prefix apps/product-web run check:bundle
```

Desktop:

```powershell
npm --prefix apps/desktop run test
npm --prefix apps/desktop run doctor
```

Validate the Compose file:

```powershell
docker compose config --quiet
```

CI runs these blocking jobs: backend tests; backend ruff plus a focused mypy gate for the reliability modules; PostgreSQL migration and schema tests; Python and Worker dependency audits; operations-console typecheck, lint, tests, build, and deployed dependency audit; product-site tests, TypeScript check, build, bundle budget, and deployed dependency audit; desktop tests, Electron runtime check, and dependency audit; and Docker Compose validation plus deployable image builds. Each npm application installs with `npm ci` from its matching lockfile.

The full backend tree still has a SQLAlchemy typing backlog. The mypy CI gate covers the reliability modules changed in this pass, while the full pytest suite remains the broad behavioral gate.

## Deployment

Production runs on Cloudflare and Neon PostgreSQL. The API uses Cloudflare
Hyperdrive for its pooled database connection. The product site is served by
Cloudflare Pages at `freightpilot.pages.dev`; the operations console is a
Cloudflare Pages project at `freightpilot-ops.pages.dev`. From the repository root:

```powershell
npm run cloudflare:deploy
```

The API deployment stages the FastAPI application and Alembic migration files,
then deploys the Worker and its Hyperdrive binding. `cloudflare:deploy:redirect`
deploys the redirect Worker; `cloudflare:deploy:console` deploys the Pages
operations console. The combined deploy builds both frontends once before
uploading them. The individual commands are `cloudflare:deploy:web`,
`cloudflare:deploy:console`, `cloudflare:deploy:redirect`, and
`cloudflare:deploy:api`. Wrangler is pinned in the root scripts so local and
release runs use the same CLI version.
Production API secrets are managed as Cloudflare Worker secrets:

```powershell
npx wrangler secret put JWT_SECRET_KEY --config infra/cloudflare/freightpilot-api/wrangler.jsonc
npx wrangler secret put PROVIDER_KEY_ENCRYPTION_SECRET --config infra/cloudflare/freightpilot-api/wrangler.jsonc
npx wrangler secret put PLATFORM_ADMIN_EMAILS --config infra/cloudflare/freightpilot-api/wrangler.jsonc
```

Before deploying code that depends on a new migration, apply the migration:

```powershell
./scripts/apply_production_migrations.ps1
```

The Worker configuration is in `infra/cloudflare/freightpilot-api/wrangler.jsonc`.
The Neon connection is provided by the Hyperdrive binding, so the Worker does
not need a production `DATABASE_URL` secret.

Production health checks can be run manually with the "Production smoke" workflow in `.github/workflows/production-smoke.yml`.

The production API's `/health` response includes `schema`, `revision`, and
`expected_revision`. A `schema` value of `current` means the live database's
Alembic revision matches the migration chain packaged with the deployed API.

## Known limitations

- Route optimization is a deterministic distance, window, capacity, and stop heuristic. It does not claim a globally optimal route.
- Delivery proof images are stored in PostgreSQL rather than object storage. Upload size and workspace storage limits are enforced.
- The default route emission calculation uses one heavy-duty vehicle weight class and U.S. EPA ton-mile factors.
- Receipt extraction depends on a configured provider key. The zero-confidence mode records the upload but does not infer fields.
- Payment-verification tolerances still require confirmation against current CBE and Dashen fee schedules before production use.
- SMS and email delivery require external gateway configuration.
- The desktop project currently runs the web operations console in Electron. It does not define a signed installer build.
- The production database host and credentials are deployment-specific and intentionally are not recorded in this repository.

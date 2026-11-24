# FreightPilot Architecture & Codebase Map

This guide maps the repository structure, application entry points, modular boundaries, and verification gates.

## Monorepo Layout

| Path | Role |
| --- | --- |
| `apps/platform-api` | FastAPI + SQLAlchemy backend, Alembic migrations (`alembic/`), pytest suite (`tests/`) |
| `apps/ops-console` | React + Vite + Tailwind + TanStack Query operations console |
| `apps/product-web` | Next.js App Router static marketing site, docs, status probe, and company launch flow |
| `apps/desktop` | Electron desktop wrapper for the hosted operations console and onboarding wizard |
| `infra/cloudflare/freightpilot-api` | Cloudflare Python Worker + Durable Object router (`src/entry.py`, `src/worker_app.py`, `scripts/prepare_app.py`) |
| `infra/cloudflare/freightpilot-ops` | Redirect Worker configuration |
| `scripts/` | Production migration, backup/restore, Neon restore drill, rotation, and funnel verification scripts |
| `docs/` | Architecture notes, behavioral specifications (`docs/behaviors/`), ADRs (`docs/adr/`), design docs (`docs/design/`), release gates (`docs/release-gates.md`) |

---

## Backend (`apps/platform-api`)

- **Entry & wiring**: `app/main.py` mounts `app/api/router.py` at `/api/v1` and configures security middleware from `app/core/http_security.py`.
- **Core utilities**: `app/core/config.py`, `app/core/observability.py`, `app/core/tenant_scope.py`, `app/api/security.py`, `app/db/session.py`, `app/db/custom_types.py`, `app/db/migration_status.py`.
- **Endpoints (`app/api/endpoints/`)**:
  - `dispatch/` sub-package (combined in `dispatch/__init__.py`):
    - `common.py`: organization lookups, response mappers, stop serialization, and proof image signature verification
    - `orders.py`: customers, delivery orders, and customer tracking links (`/dispatch/customers`, `/dispatch/orders`, `/dispatch/tracking`)
    - `runs.py`: single-vehicle and fleet route planning, dispatch run queries, driver links, and day-end cash close
    - `driver.py`: driver token context and mobile driver manifest/status/cash/proof endpoints
  - Domain endpoints: `activation.py`, `alerts.py`, `auth.py`, `billing.py`, `cash_collections.py`, `drivers.py`, `feedback.py`, `forecast.py`, `health.py`, `ingestion.py`, `insights.py`, `inventory.py`, `invoices.py`, `items.py`, `live.py`, `notifications.py`, `ops.py`, `orders.py`, `planning.py`, `providers.py`, `receipt_reversals.py`, `receipts.py`, `routes.py`, `shipments.py`, `subscriptions.py`, `team.py`, `warehouses.py`, `weather.py`.
- **Services (`app/services/`)**:
  - `activation/`: `banner.py`, `freecap.py`, `ingest.py`, `reset.py`, `seeding.py`, `state.py`
  - `billing/`: `credits.py`, `invoices.py`, `lifecycle.py`, `locks.py`, `money.py`, `pricing.py`, `receipt_extraction.py`, `sms.py`, `trusted_payers.py`, `wallet.py`
  - Operations & intelligence: `dispatch.py`, `routing.py`, `route_explanations.py`, `rerouting.py`, `forecasting.py`, `decision_intelligence.py`, `cash_ledger.py`, `live_feed.py`, `weather.py`, `metering.py`, `audit.py`, `authz.py`, `email_delivery.py`, `security.py`, `worker_crypto.py`
- **Cloudflare Worker Durable Object groups (`infra/cloudflare/freightpilot-api/src/`)**:
  `entry.py` routes `/api/v1/<resource>` to specialized Durable Object classes built by `worker_app.build_app(group)`:
  - `core` (`FREIGHTPILOT_API`): `auth`, `health`, `providers`
  - `data` (`FREIGHTPILOT_DATA`): `warehouses`, `items`, `inventory`, `orders`, `notifications`, `feedback`
  - `account` (`FREIGHTPILOT_ACCOUNT`): `activation`, `subscriptions`, `team`, `billing`
  - `logistics` (`FREIGHTPILOT_LOGISTICS`): `shipments`, `alerts`, `ops`, `insights`, `weather`
  - `operations` (`FREIGHTPILOT_OPERATIONS`): `drivers`, `cash_collections`, `planning`
  - `dispatch` (`FREIGHTPILOT_DISPATCH`): `dispatch`
  - `finance` (`FREIGHTPILOT_FINANCE`): `receipts`, `receipt_reversals`, `invoices`
  - `routing` (`FREIGHTPILOT_ROUTING`): `ingestion`, `routes`
  - `analytics` (`FREIGHTPILOT_ANALYTICS`): `forecast`, `live`

---

## Operations Console (`apps/ops-console/src`)

- **Routing & layout**: `App.tsx` (routes + `RouteTitle`), `context/AuthContext.tsx`, `components/Layout.tsx`, `components/ProtectedRoute.tsx`, `components/ErrorBoundary.tsx`.
- **Domain types (`src/types/`)**:
  Barrel re-export at `types/api.ts` backed by focused domain modules:
  `common.ts`, `logistics.ts`, `billing.ts`, `dispatch.ts`, `insights.ts`, `receipts.ts`, `activation.ts`, `fleet.ts`, plus `auth.ts`.
- **Services & hooks**:
  - API modules (`src/services/`): `api.ts`, `authApi.ts`, `authErrors.ts`, `activationApi.ts`, `billingApi.ts`, `dispatchApi.ts`, `driverProofQueue.ts`, `insightsApi.ts`, `logisticsApi.ts`, `receiptsApi.ts`, `routeHistoryDetail.ts`, `teamApi.ts`
  - Hooks (`src/hooks/`): `queries.ts`, `useLiveUpdates.ts`, `liveInvalidation.ts`
- **Feature component directories (`src/components/`)**:
  - `ui/`: `Dialog.tsx`, `MetricTile.tsx`, `PageHeader.tsx`, `Panel.tsx`, `StatusBadge.tsx`
  - `shell/`: `ShellHeader.tsx`, `ShellSidebar.tsx`, `WorkspaceRail.tsx`, `SessionLiveUpdates.tsx`
  - `login/`: `LoginFeedbackPanels.tsx`
  - `account/`: `PlanComparisonSection.tsx`, `ProviderKeysCard.tsx`
  - `dispatch/`: `DispatchSetupForms.tsx`, `DispatchPlanForm.tsx`, `DispatchRunsList.tsx`, `CloseCashDialog.tsx`
  - `drivers/`: `CashDialogs.tsx`, `DriverRosterPanel.tsx`, `DriverCashLedgerPanel.tsx`, `driverFormatting.ts`
  - `driver-mobile/`: `DriverStopCard.tsx`, `driverCopy.ts`, `driverStorage.ts`
  - `receipts/`: `ReversalActionButtons.tsx`, `AuditEventsDrawer.tsx`, `ReversalsPanel.tsx`, `ReceiptReviewDetailPane.tsx`, `receiptReviewConstants.ts`
- **Pages (`src/pages/`)**:
  `DashboardPage.tsx`, `RoutesPage.tsx`, `ShipmentsPage.tsx`, `PlanningPage.tsx`, `AlertsPage.tsx`, `UploadPage.tsx`, `DispatchPage.tsx`, `DriversPage.tsx`, `ReceiptsPage.tsx`, `AdminReceiptsPage.tsx`, `ProvidersPage.tsx`, `AccountPage.tsx`, `LoginPage.tsx`, `AcceptInvitePage.tsx`, `DriverPage.tsx`, `TrackingPage.tsx`, `UnauthorizedPage.tsx`.
- **Guard tests**: `App.composition.guard.test.ts`, `loginContrast.guard.test.ts`, `motion.guard.test.ts`, `opsPolish.guard.test.ts`, `surfaceTokens.guard.test.ts`, `services/internalNavGuard.test.ts`.

---

## Product Site (`apps/product-web/src`) & Desktop (`apps/desktop`)

- **Product Web**: Next.js static pages under `src/app/` (`page.tsx`, `platform/`, `technology/`, `pricing/`, `launch/`, `contact/`, `docs/`, `status/`, `privacy/`, `terms/`, `security/`), shared UI under `src/components/site/`, centralized site copy in `src/lib/site-content.ts`, signup client in `src/lib/company-signup.ts`, and guards in `src/siteSecurity.guard.test.ts`.
- **Desktop**: Electron main process (`src/main.cjs`), onboarding view (`src/onboarding.html`, `src/onboarding.css`, `src/onboarding.js`), URL validator (`src/file-url.cjs`), and tests under `apps/desktop/scripts/`.

---

## Quick Verification Commands

From the repository root:

- `npm run check:frontend` — Desktop tests + Ops Console (`typecheck`, `lint`, `test`) + Product Web (`typecheck`, `test`)
- `npm run build` — Production builds for both Ops Console and Product Web
- `npm run check:bundle:web` — Verify per-route raw bundle weights (< 1.2 MB)

See [README.md](../README.md) and [docs/release-gates.md](release-gates.md) for backend pytest/ruff/mypy, PostgreSQL, Docker, and production smoke commands.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';

import { ActivationBanner } from '../components/ActivationBanner';
import { DecisionBriefPanel } from '../components/DecisionBriefPanel';
import { DockGanttChart } from '../components/DockGanttChart';
import { FeedbackForm } from '../components/FeedbackForm';
import { FreightReconciliationPanel } from '../components/FreightReconciliationPanel';
import { ForecastChart } from '../components/ForecastChart';
import { InventoryCharts } from '../components/InventoryCharts';
import { MetricTile } from '../components/ui/MetricTile';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { StatusBadge } from '../components/ui/StatusBadge';
import {
  useActivationState,
  useAuditTimeline,
  useCurrentUsage,
  useDockAppointments,
  useExceptionFeed,
  useForecast,
  useInventoryOverview,
  useInvalidateDashboard,
  useLiveDataInvalidator,
  useReplenishmentPlans,
  useRouteSchedules,
  useShipments,
  useWeatherRiskZones,
} from '../hooks/queries';
import { useLivePayload, useLivePayloadStream } from '../hooks/useLiveUpdates';

function severityTone(severity: string) {
  if (severity === 'critical' || severity === 'danger') return 'danger';
  if (severity === 'high' || severity === 'warning') return 'warning';
  if (severity === 'medium' || severity === 'info') return 'info';
  return 'neutral';
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton animate-pulse ${className ?? ''}`} />;
}

// NB-29.3 panel gate map: hidden vs placeholder per surface, milestone
// threshold fixed — no per-panel configuration path.
const PANEL_GATES = [
  { id: 'inventory-charts', mode: 'placeholder', milestone: 4 },
  { id: 'utilization', mode: 'placeholder', milestone: 4 },
  { id: 'forecast-chart', mode: 'placeholder', milestone: 5 },
  { id: 'forecast-demand', mode: 'placeholder', milestone: 5 },
  { id: 'weather-risk', mode: 'placeholder', milestone: 5 },
  { id: 'dock-gantt', mode: 'hidden', milestone: 6 },
  { id: 'freight-recon', mode: 'hidden', milestone: 6 },
] as const;

function gateMilestone(id: (typeof PANEL_GATES)[number]['id']) {
  return PANEL_GATES.find((gate) => gate.id === id)!.milestone;
}

export { PANEL_GATES };

function GatePlaceholder({ milestone }: { milestone: number }) {
  return (
    <div className="grid h-full min-h-[130px] place-items-center border border-dashed border-[#c8d4cf] bg-[#f8faf9] p-5 text-center">
      <div>
        <p className="text-sm font-semibold text-[#40534c]">
          Unlocks after Milestone {milestone}
        </p>
        <Link to="/upload" className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#087f72] underline-offset-4 hover:underline">
          Continue onboarding
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonBlock className="h-[80px]" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <SkeletonBlock key={i} className="h-[110px] rounded-[var(--fp-radius-panel)]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="h-[110px] rounded-[var(--fp-radius-panel)]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <SkeletonBlock className="h-[300px]" />
        <SkeletonBlock className="h-[300px]" />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const invalidateDashboard = useInvalidateDashboard();

  const inventoryQ = useInventoryOverview();
  const forecastQ = useForecast(4);
  const schedulesQ = useRouteSchedules();
  const shipmentsQ = useShipments();
  const plansQ = useReplenishmentPlans();
  const usageQ = useCurrentUsage();
  const feedQ = useExceptionFeed();
  const auditQ = useAuditTimeline();
  const riskQ = useWeatherRiskZones();
  const appointmentsQ = useDockAppointments();
  const activationQ = useActivationState();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // the live payload comes from the session-scoped store owned by
  // SessionLiveUpdates — the chip survives page switches (decision 8) and
  // background invalidation is coalesced + payload-scoped (decisions 5/6);
  // invalidations only run while this page is mounted (stream subscription).
  const livePayload = useLivePayload();
  const invalidateLivePayload = useLiveDataInvalidator();

  useLivePayloadStream((payload) => {
    invalidateLivePayload(payload);
  });

  // NB-77 lint gate: derive each list with a stable identity. A bare
  // `data ?? []` allocates a new array on every render, so the `summary` memo
  // below would recompute on each pass and the exhaustive-deps rule flagged
  // the six list inputs as unstable dependencies.
  const inventory = useMemo(() => inventoryQ.data ?? [], [inventoryQ.data]);
  const forecast = useMemo(() => forecastQ.data?.points ?? [], [forecastQ.data]);
  const schedules = useMemo(() => schedulesQ.data ?? [], [schedulesQ.data]);
  const shipments = useMemo(() => shipmentsQ.data ?? [], [shipmentsQ.data]);
  const plans = useMemo(() => plansQ.data ?? [], [plansQ.data]);
  const usage = usageQ.data ?? null;
  const exceptionFeed = feedQ.data ?? null;
  const auditEvents = auditQ.data ?? [];
  const riskZones = useMemo(() => riskQ.data ?? [], [riskQ.data]);
  const appointments = appointmentsQ.data ?? [];

  // milestone = 6 once m6 completes, else the sequential N-of-5.
  const activation = activationQ.data ?? null;
  const milestone = activation?.m6_completed ? 6 : (activation?.n_of_5 ?? 0);

  const isLoading =
    inventoryQ.isLoading ||
    forecastQ.isLoading ||
    schedulesQ.isLoading ||
    shipmentsQ.isLoading ||
    plansQ.isLoading ||
    feedQ.isLoading;

  const firstError =
    inventoryQ.error || forecastQ.error || schedulesQ.error ||
    shipmentsQ.error || plansQ.error || feedQ.error || auditQ.error ||
    riskQ.error || usageQ.error || appointmentsQ.error;

  const summary = useMemo(() => {
    const stock = inventory.reduce((sum, row) => sum + row.total_quantity_on_hand, 0);
    const safety = inventory.reduce((sum, row) => sum + row.total_safety_stock, 0);
    const avgUtil = inventory.length
      ? inventory.reduce((sum, row) => sum + row.utilization_percent, 0) / inventory.length
      : 0;
    const delayedShipments = shipments.filter((s) => s.status === 'delayed');
    const inTransitShipments = shipments.filter((s) => s.status === 'in_transit');
    const pendingPlans = plans.filter((p) => p.status === 'pending_approval');
    const forecastDemand = forecast.reduce((sum, point) => sum + point.predicted_demand, 0);
    const maxRiskScore = riskZones.length > 0 && schedules.length > 0
      ? Math.max(...riskZones.map((z) => z.severity_score))
      : 0;
    return {
      stock, safety,
      avgUtil: avgUtil.toFixed(1),
      delayedShipments, inTransitShipments,
      pendingPlans, forecastDemand,
      usagePercent: usage?.utilization_percent ?? null,
      maxRiskScore,
    };
  }, [forecast, inventory, plans, shipments, usage, riskZones, schedules]);

  async function handleRefresh() {
    setIsRefreshing(true);
    invalidateDashboard();
    setTimeout(() => setIsRefreshing(false), 800);
  }

  if (isLoading) return <DashboardSkeleton />;

  const feedSummary = exceptionFeed?.summary;
  const feedItems = exceptionFeed?.items ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Control tower"
        title="Today's operation"
        description="Exceptions, movement, and decisions that need attention now."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {livePayload ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-[#5b6d66]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#16856b]" aria-hidden="true" />
                Live sync {new Date(livePayload.server_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="glow-ring inline-flex h-9 w-9 items-center justify-center border border-[#cfd9d5] bg-white text-[#40534c] transition-colors hover:bg-[#eef3f0] disabled:opacity-60"
              aria-label={isRefreshing ? 'Refreshing data' : 'Refresh data'}
              title={isRefreshing ? 'Refreshing data' : 'Refresh data'}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>
          </div>
        }
      />

      <ActivationBanner mode="compact" />

      <section aria-label="Operational summary" className="grid grid-cols-2 overflow-hidden border border-[#d7dfdc] bg-white lg:grid-cols-5">
        <div className="col-span-2 border-b border-[#e2e8e5] bg-[#fffaf0] px-4 py-3 lg:col-span-1 lg:border-b-0 lg:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a5b09]">Needs attention</p>
          <p className="mt-1 font-mono text-[25px] leading-7 text-[#5f3c00]">{feedSummary?.open_alerts ?? 0}</p>
          <p className="mt-1 text-xs text-[#6f5b3c]">Open exceptions</p>
        </div>
        <div className="border-b border-r border-[#e2e8e5] px-4 py-3 lg:border-b-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#63766f]">In-transit</p>
          <p className="mt-1 font-mono text-[25px] leading-7 text-[#172a24]">{summary.inTransitShipments.length}</p>
          <p className="mt-1 text-xs text-[#63766f]">Active shipments</p>
        </div>
        <div className="border-b border-[#e2e8e5] px-4 py-3 lg:border-b-0 lg:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#63766f]">Delayed</p>
          <p className="mt-1 font-mono text-[25px] leading-7 text-[#172a24]">{feedSummary?.delayed_shipments ?? summary.delayedShipments.length}</p>
          <p className="mt-1 text-xs text-[#63766f]">Shipments past plan</p>
        </div>
        {milestone >= gateMilestone('forecast-demand') ? (
          <MetricTile
            title="Forecast demand"
            value={summary.forecastDemand.toLocaleString()}
            detail="Next 4 weeks"
            tone="neutral"
          />
        ) : (
          <MetricTile
            title="Forecast demand"
            value="Locked"
            detail="Unlocks after Milestone 5."
            tone="neutral"
            cta={{ label: 'Continue onboarding', href: '/upload' }}
          />
        )}
        {milestone >= gateMilestone('weather-risk') ? (
          <MetricTile
            title="Simulated weather risk"
            value={summary.maxRiskScore > 0 ? `${summary.maxRiskScore}/10` : 'None'}
            detail="Simulation, not live weather"
            tone={summary.maxRiskScore >= 8 ? 'danger' : summary.maxRiskScore >= 5 ? 'warning' : 'success'}
          />
        ) : (
          <MetricTile
            title="Simulated weather risk"
            value="Locked"
            detail="After Milestone 5"
            tone="neutral"
            cta={{ label: 'Continue onboarding', href: '/upload' }}
          />
        )}
        <MetricTile
          title="Usage posture"
          value={summary.usagePercent == null ? 'N/A' : `${summary.usagePercent}%`}
          detail={summary.usagePercent == null ? 'Usage unavailable' : 'Monthly task volume'}
          tone={summary.usagePercent != null && summary.usagePercent >= 100 ? 'danger' : summary.usagePercent != null && summary.usagePercent >= 80 ? 'warning' : 'success'}
        />
      </section>

      {firstError ? (
        <Panel className="border-[#e7c2be] bg-[#fff8f7]">
          <p className="text-sm text-[#8f302a]">
            Some data surfaces could not load. {(firstError as Error)?.message || 'Try refreshing.'}
          </p>
        </Panel>
      ) : null}

      <DecisionBriefPanel />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel
          eyebrow="Exception queue"
          title="What needs operator action"
          description="Unified feed: alerts, pending approvals, and route interventions."
        >
          <div className="divide-y divide-[#e6ebe8]">
            {feedItems.slice(0, 6).map((item) => (
              <article
                key={`${item.source_type}:${item.source_id}`}
                className="py-3 transition-colors hover:bg-[#f8faf9]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={item.severity} tone={severityTone(item.severity)} />
                    <span className="text-[10px] font-medium uppercase tracking-wide text-[#6b7d76]">{item.source_type}</span>
                    <h3 className="text-sm font-semibold text-[#20372f]">{item.title}</h3>
                  </div>
                  <span className="text-xs text-[#6b7d76]">{new Date(item.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-[#5b6d66]">{item.message}</p>
              </article>
            ))}
            {feedItems.length === 0 ? (
              <div className="border border-[#b9dcd1] bg-[#f3faf7] p-5 text-center">
                <p className="text-sm font-semibold text-[#14745f]">Queue clear</p>
                <p className="mt-1 text-xs text-[#4f6e63]">No open alerts requiring operator attention.</p>
              </div>
            ) : null}
          </div>
        </Panel>

        <div className="grid gap-4">
          <Panel eyebrow="Execution posture" title="Workspace readiness">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div className="border-t border-[#e2e8e5] pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7d76]">Inventory on hand</p>
                <p className="mt-1 font-mono text-xl tabular-nums text-[#172a24]">{summary.stock.toLocaleString()}</p>
                <p className="mt-0.5 text-xs text-[#63766f]">Safety stock: {summary.safety.toLocaleString()} units</p>
              </div>
              {milestone >= gateMilestone('utilization') ? (
                <div className="border-t border-[#e2e8e5] pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7d76]">Capacity utilization</p>
                  <p className="mt-1 font-mono text-xl tabular-nums text-[#172a24]">{summary.avgUtil}%</p>
                  <p className="mt-0.5 text-xs text-[#63766f]">Average across inventory.</p>
                </div>
              ) : (
                <div className="border-t border-dashed border-[#c8d4cf] pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7d76]">Capacity utilization</p>
                  <p className="mt-1 text-xs text-[#63766f]">After Milestone 4.</p>
                  <Link to="/upload" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#087f72] underline-offset-4 hover:underline">
                    Continue onboarding
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              )}
              <div className="border-t border-[#e2e8e5] pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7d76]">Pending approvals</p>
                <p className="mt-1 font-mono text-xl tabular-nums text-[#172a24]">{summary.pendingPlans.length}</p>
                <p className="mt-0.5 text-xs text-[#63766f]">Plans awaiting sign-off.</p>
              </div>
              <div className="border-t border-[#e2e8e5] pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7d76]">Route schedules</p>
                <p className="mt-1 font-mono text-xl tabular-nums text-[#172a24]">{schedules.length}</p>
                <p className="mt-0.5 text-xs text-[#63766f]">Saved optimization output.</p>
              </div>
            </div>
          </Panel>

          <Panel eyebrow="Audit timeline" title="Latest workspace actions">
            <div className="space-y-3">
              {auditEvents.slice(0, 4).map((event) => (
                <article key={event.id} className="border-t border-[#e2e8e5] pt-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-semibold text-[#20372f]">{event.description}</h3>
                      <p className="mt-0.5 font-mono text-[10px] text-[#63766f]">{event.event_type}</p>
                    </div>
                    <span className="text-[11px] text-[#6b7d76]">{new Date(event.created_at).toLocaleString()}</span>
                  </div>
                </article>
              ))}
              {auditEvents.length === 0 ? <p className="text-xs text-[#63766f]">No audit events yet.</p> : null}
            </div>
          </Panel>
        </div>
      </div>

      {milestone >= gateMilestone('dock-gantt') ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel eyebrow="Dock Management" title="Live Capacity Setup">
            <div className="h-[400px]">
              <DockGanttChart appointments={appointments} />
            </div>
          </Panel>
          <Panel eyebrow="Finance" title="Freight Invoice Reconciliation">
            <div className="h-[400px]">
              <FreightReconciliationPanel />
            </div>
          </Panel>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <FeedbackForm />
        </div>
        <div className="xl:col-span-2 space-y-4">
          {milestone >= gateMilestone('inventory-charts') ? (
            <InventoryCharts data={inventory} />
          ) : (
            <Panel eyebrow="Inventory" title="Stock position by warehouse">
              <GatePlaceholder milestone={gateMilestone('inventory-charts')} />
            </Panel>
          )}
          {milestone >= gateMilestone('forecast-chart') ? (
            <ForecastChart
              points={forecast}
              quality={forecastQ.data?.quality}
              modelName={forecastQ.data?.model_name}
            />
          ) : (
            <Panel eyebrow="Forecast" title="4-week demand projection">
              <GatePlaceholder milestone={gateMilestone('forecast-chart')} />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}


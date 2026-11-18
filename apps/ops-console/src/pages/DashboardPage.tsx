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
          Available after setup step {milestone}
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

type DashboardPageProps = {
  referenceNow?: Date;
};

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage({ referenceNow = new Date() }: DashboardPageProps = {}) {
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
        eyebrow="Overview"
        title={greetingFor(referenceNow.getHours())}
        description="Here is what needs your attention today."
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
              className="fp-action-secondary h-9 w-9 !px-0"
              aria-label={isRefreshing ? 'Refreshing data' : 'Refresh data'}
              title={isRefreshing ? 'Refreshing data' : 'Refresh data'}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>
          </div>
        }
      />

      <ActivationBanner mode="compact" />

      <section aria-label="Today at a glance" className="grid overflow-hidden rounded-lg border border-[#e5e4e0] bg-white sm:grid-cols-2 lg:grid-cols-5 lg:divide-x lg:divide-[#efeeea]">
        <div className="border-b border-[#efeeea] px-4 py-3.5 lg:border-b-0">
          <p className="text-[12px] font-medium text-[#73736e]">Needs attention</p>
          <p className="mt-1.5 text-[28px] font-semibold leading-8 tabular-nums tracking-[-0.02em] text-[#252522]">{feedSummary?.open_alerts ?? 0}</p>
          <p className="mt-1 text-[12px] text-[#85857e]">Open exceptions</p>
        </div>
        <div className="border-b border-[#efeeea] px-4 py-3.5 lg:border-b-0">
          <p className="text-[12px] font-medium text-[#73736e]">In transit</p>
          <p className="mt-1.5 text-[28px] font-semibold leading-8 tabular-nums tracking-[-0.02em] text-[#252522]">{summary.inTransitShipments.length}</p>
          <p className="mt-1 text-[12px] text-[#85857e]">Active shipments</p>
        </div>
        <div className="border-b border-[#efeeea] px-4 py-3.5 lg:border-b-0">
          <p className="text-[12px] font-medium text-[#73736e]">Delayed</p>
          <p className="mt-1.5 text-[28px] font-semibold leading-8 tabular-nums tracking-[-0.02em] text-[#252522]">{feedSummary?.delayed_shipments ?? summary.delayedShipments.length}</p>
          <p className="mt-1 text-[12px] text-[#85857e]">Shipments past plan</p>
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
            detail="Available after setup step 5."
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
            detail="After setup step 5"
            tone="neutral"
            cta={{ label: 'Continue onboarding', href: '/upload' }}
          />
        )}
        <MetricTile
          title="Plan usage"
          value={summary.usagePercent == null ? 'N/A' : `${summary.usagePercent}%`}
          detail={summary.usagePercent == null ? 'Usage unavailable' : 'Monthly task volume'}
          tone={summary.usagePercent != null && summary.usagePercent >= 100 ? 'danger' : summary.usagePercent != null && summary.usagePercent >= 80 ? 'warning' : 'success'}
          className="sm:col-span-2 lg:col-span-4 xl:col-span-1 xl:border-l xl:border-[#efeeea]"
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
          eyebrow="Priority"
          title="Needs attention"
          description="Open exceptions, approvals, and route issues."
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
                    <span className="text-[11px] font-medium text-[#85857e]">{item.source_type}</span>
                    <h3 className="text-sm font-semibold text-[#20372f]">{item.title}</h3>
                  </div>
                  <span className="text-xs text-[#6b7d76]">{new Date(item.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-[#5b6d66]">{item.message}</p>
              </article>
            ))}
            {feedItems.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-[#353530]">You're all caught up</p>
                <p className="mt-1 text-xs text-[#4f6e63]">No open alerts requiring operator attention.</p>
              </div>
            ) : null}
          </div>
        </Panel>

        <div className="grid gap-4">
          <Panel title="Workspace at a glance">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div className="border-t border-[#efeeea] pt-3">
                <p className="text-[12px] text-[#73736e]">Inventory on hand</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-[#252522]">{summary.stock.toLocaleString()}</p>
                <p className="mt-0.5 text-[12px] text-[#85857e]">Safety stock: {summary.safety.toLocaleString()} units</p>
              </div>
              {milestone >= gateMilestone('utilization') ? (
                <div className="border-t border-[#efeeea] pt-3">
                  <p className="text-[12px] text-[#73736e]">Warehouse space used</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-[#252522]">{inventory.length ? `${summary.avgUtil}%` : 'No stock yet'}</p>
                  <p className="mt-0.5 text-[12px] text-[#85857e]">Average across inventory.</p>
                </div>
              ) : (
                <div className="border-t border-[#efeeea] pt-3">
                  <p className="text-[12px] text-[#73736e]">Warehouse space used</p>
                  <p className="mt-1 text-xs text-[#63766f]">Available after setup step 4.</p>
                  <Link to="/upload" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#087f72] underline-offset-4 hover:underline">
                    Continue onboarding
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              )}
              <div className="border-t border-[#efeeea] pt-3">
                <p className="text-[12px] text-[#73736e]">Pending approvals</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-[#252522]">{summary.pendingPlans.length}</p>
                <p className="mt-0.5 text-[12px] text-[#85857e]">Plans awaiting sign-off.</p>
              </div>
              <div className="border-t border-[#efeeea] pt-3">
                <p className="text-[12px] text-[#73736e]">Route schedules</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-[#252522]">{schedules.length}</p>
            <p className="mt-0.5 text-[12px] text-[#85857e]">Saved route plans.</p>
              </div>
            </div>
          </Panel>

          <Panel title="Recent activity">
            <div className="space-y-3">
              {auditEvents.slice(0, 4).map((event) => (
                <article key={event.id} className="border-t border-[#efeeea] pt-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-semibold text-[#20372f]">{event.description}</h3>
                      <p className="mt-0.5 text-[11px] text-[#85857e]">{event.event_type}</p>
                    </div>
                    <span className="text-[11px] text-[#6b7d76]">{new Date(event.created_at).toLocaleString()}</span>
                  </div>
                </article>
              ))}
              {auditEvents.length === 0 ? <p className="text-xs text-[#63766f]">No recent changes.</p> : null}
            </div>
          </Panel>
        </div>
      </div>

      {milestone >= gateMilestone('dock-gantt') ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel title="Dock capacity">
            <div className="h-[400px]">
              <DockGanttChart appointments={appointments} />
            </div>
          </Panel>
          <Panel title="Invoice and freight charge checks">
            <div className="h-[400px]">
              <FreightReconciliationPanel />
            </div>
          </Panel>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2.45fr)] xl:items-start">
        <div className="xl:pr-6">
          <FeedbackForm />
        </div>
        <div className="min-w-0 space-y-4">
          {milestone >= gateMilestone('inventory-charts') ? (
            <InventoryCharts data={inventory} />
          ) : (
            <Panel title="Stock position by warehouse">
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
            <Panel title="4-week demand projection">
              <GatePlaceholder milestone={gateMilestone('forecast-chart')} />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}


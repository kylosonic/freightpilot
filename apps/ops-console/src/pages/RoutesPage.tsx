import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { PostAhaToast } from '../components/PostAhaToast';
import { RouteHistoryCard } from '../components/RouteHistoryCard';
import { RouteMap } from '../components/RouteMap';
import { RouteOptimizerForm } from '../components/RouteOptimizerForm';
import { RouteSchedulesTable } from '../components/RouteSchedulesTable';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { useActivationState } from '../hooks/queries';
import { useLivePayloadStream } from '../hooks/useLiveUpdates';
import { getRouteOptimizationHistory, getRouteSchedules, getWeatherRiskZones } from '../services/logisticsApi';
import type { RouteOptimizationRunSummary, RouteOptimizeResponse, RouteScheduleSummary, RouteStop, WeatherRiskZone } from '../types/api';
import { apiErrorMessage } from '../services/authErrors';

export function RoutesPage() {
  const activationQ = useActivationState();
  const [schedules, setSchedules] = useState<RouteScheduleSummary[]>([]);
  const [history, setHistory] = useState<RouteOptimizationRunSummary[]>([]);
  const [riskZones, setRiskZones] = useState<WeatherRiskZone[]>([]);
  const [latestRouteStops, setLatestRouteStops] = useState<RouteStop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [postAhaVisible, setPostAhaVisible] = useState(false);

  // the weather risk zones map unlocks at milestone 5; the page
  // itself remains routable — optimize 423s only on locks.
  const milestone = activationQ.data?.m6_completed ? 6 : (activationQ.data?.n_of_5 ?? 0);
  const weatherMapUnlocked = milestone >= 5;

  async function loadSchedules() {
    try {
      setError(null);
      const [scheduleData, historyData, riskData] = await Promise.all([
        getRouteSchedules(),
        getRouteOptimizationHistory(),
        getWeatherRiskZones().catch(() => [])
      ]);
      setSchedules(scheduleData);
      setHistory(historyData);
      setRiskZones(riskData);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load route schedules'));
    }
  }

  useEffect(() => {
    loadSchedules();
  }, []);

  // the shared session stream replaces this page's own socket — the
  // listener fires ONLY on new publishes (never on mount), so mount freshness
  // stays with loadSchedules() above (blueprint decision 9).
  useLivePayloadStream((payload) => {
    setSchedules(payload.route_summaries);
  });

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadSchedules();
    setIsRefreshing(false);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Route studio"
        title="Build, compare, and operationalize route scenarios"
        description="Model a route, compare results, and keep the saved schedule visible."
        actions={
          <button
            onClick={handleRefresh}
            className="glow-ring inline-flex min-h-9 items-center justify-center gap-2 border border-[#cfd9d5] bg-white px-3 text-xs font-semibold text-[#40534c] transition-colors hover:bg-[#eef3f0]"
          >
            {isRefreshing ? (
              <svg className="animate-spin-slow h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="50 20" /></svg>
            ) : null}
            {isRefreshing ? 'Refreshing...' : 'Refresh schedules'}
          </button>
        }
      />

      {error ? (
        <Panel className="border-[#e7c2be] bg-[#fff8f7]">
          <p className="text-sm text-[#8f302a]">{error}</p>
        </Panel>
      ) : null}

      {/* Workstation split: the route model form is the dominant surface;
          the map reads clearly subordinate until results exist. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <RouteOptimizerForm
          onOptimized={(route: RouteOptimizeResponse) => {
            setLatestRouteStops(route.stops);
            loadSchedules();
            // fire the one-time toast exactly when the server says
            // this was the org's FIRST optimization (server truth).
            if (route.post_aha_toast) {
              setPostAhaVisible(true);
            }
          }}
        />
        {weatherMapUnlocked ? (
          <RouteMap stops={latestRouteStops} riskZones={riskZones} />
        ) : (
          <Panel eyebrow="Simulated weather risk" title="Simulated weather risk zones">
            <div className="grid h-full min-h-[240px] place-items-center border border-dashed border-[#c8d4cf] bg-[#f8faf9] p-6 text-center">
              <div>
                <p className="text-sm font-semibold text-[#40534c]">
                  Unlocks after Milestone 5
                </p>
                <Link to="/upload" className="mt-1.5 inline-block text-xs font-semibold text-[#087f72] underline-offset-4 hover:underline">
                  Continue onboarding
                </Link>
              </div>
            </div>
          </Panel>
        )}
      </div>

      <Panel
        eyebrow="Schedule library"
        title="Saved route schedules"
        description="Operational route outputs persist here so the team can reference the latest optimized plans."
      >
        <RouteSchedulesTable schedules={schedules} />
      </Panel>

      <Panel
        eyebrow="Scenario history"
        title="Recent route optimization runs"
        description="Every optimization run now keeps a scenario record so the team can review what was modeled, what persisted, and where manual intervention was still required."
      >
        <div className="space-y-3">
          {history.slice(0, 6).map((run) => (
            <RouteHistoryCard key={run.id} run={run} />
          ))}

          {history.length === 0 ? (
            <div className="border border-dashed border-[#c8d4cf] bg-[#f8faf9] p-6 text-center">
              <p className="text-sm font-semibold text-[#40534c]">No optimization history</p>
              <p className="mt-1 text-xs text-[#63766f]">Run a route optimization above to start building scenario history.</p>
            </div>
          ) : null}
        </div>
      </Panel>

      <PostAhaToast visible={postAhaVisible} onDismiss={() => setPostAhaVisible(false)} />
    </div>
  );
}


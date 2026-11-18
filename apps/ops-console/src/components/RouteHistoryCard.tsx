import { useState } from 'react';

import { loadRouteHistoryDetail } from '../services/routeHistoryDetail';
import type { RouteOptimizationRunDetail, RouteOptimizationRunSummary } from '../types/api';
import { RouteDecisionBrief } from './RouteDecisionBrief';
import { StatusBadge } from './ui/StatusBadge';

export function RouteHistoryCard({ run }: { run: RouteOptimizationRunSummary }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<RouteOptimizationRunDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleExplanation() {
    if (expanded) {
      setExpanded(false);
      return;
    }

    setExpanded(true);
    if (detail) return;

    setIsLoading(true);
    setError(null);
    const loaded = await loadRouteHistoryDetail(run.id);
    setDetail(loaded.detail);
    setError(loaded.error);
    setIsLoading(false);
  }

  return (
    <article className="fp-row">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              label={run.persist_requested ? 'persisted run' : 'draft run'}
              tone={run.persist_requested ? 'success' : 'info'}
            />
            {run.unassigned_count > 0 ? (
              <StatusBadge label={`${run.unassigned_count} unassigned`} tone="warning" />
            ) : null}
          </div>
          <h3 className="mt-1.5 text-sm font-semibold text-[#20372f]">{run.route_name}</h3>
          <p className="mt-0.5 text-xs text-[#63766f]">
            {run.schedule_date} from {run.start_warehouse_code}
          </p>
        </div>
        <span className="text-[11px] text-[#6b7d76]">{new Date(run.created_at).toLocaleString()}</span>
      </div>

      <div className="mt-2 grid gap-1 text-xs text-[#63766f] sm:grid-cols-4">
        <span>
          <span className="font-mono font-semibold tabular-nums text-[#40534c]">{run.total_distance_km}</span> km
        </span>
        <span>
          <span className="font-mono font-semibold tabular-nums text-[#40534c]">{run.total_cost.toLocaleString()} units</span>
        </span>
        <span>
          <span className="font-mono font-semibold tabular-nums text-[#40534c]">{run.estimated_duration_min}</span> min
        </span>
        <span>
          <span className="font-mono font-semibold tabular-nums text-[#40534c]">{run.deliveries_count}</span> deliveries
        </span>
      </div>

      <button
        type="button"
        onClick={toggleExplanation}
        aria-expanded={expanded}
        className="glow-ring mt-2 inline-flex min-h-7 items-center border border-[#c8d4cf] bg-white px-2.5 text-[11px] font-semibold text-[#087f72] transition hover:bg-[#eef6f2]"
      >
        {expanded ? 'Hide explanation' : 'Why this route'}
      </button>

      {expanded ? (
        <RouteHistoryExplanationState
          isLoading={isLoading}
          error={error}
          detail={detail}
        />
      ) : null}
    </article>
  );
}

export function RouteHistoryExplanationState({
  isLoading,
  error,
  detail,
}: {
  isLoading: boolean;
  error: string | null;
  detail: RouteOptimizationRunDetail | null;
}) {
  return (
    <div className="mt-3">
      {isLoading ? <div className="skeleton h-32" /> : null}
      {error ? (
        <p className="border border-[#e7c2be] bg-[#fff8f7] px-3 py-2 text-sm text-[#8f302a]">
          {error}
        </p>
      ) : null}
      {!isLoading && !error ? (
        <RouteDecisionBrief explanation={detail?.decision_explanation} />
      ) : null}
    </div>
  );
}

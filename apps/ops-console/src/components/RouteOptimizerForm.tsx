import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { Panel } from './ui/Panel';
import { StatusBadge } from './ui/StatusBadge';
import { RouteDecisionBrief } from './RouteDecisionBrief';
import { optimizeRoute } from '../services/logisticsApi';
import type { RouteOptimizeResponse } from '../types/api';
import { apiErrorMessage } from '../services/authErrors';

export function RouteOptimizerForm({
  onOptimized,
}: {
  onOptimized?: (route: RouteOptimizeResponse) => void;
}) {
  const queryClient = useQueryClient();
  const [previousResult, setPreviousResult] = useState<RouteOptimizeResponse | null>(null);
  const [payload, setPayload] = useState({
    route_name: 'Daily Optimized Route',
    schedule_date: new Date().toISOString().slice(0, 10),
    start_warehouse_code: 'WH-001',
    deliveries: 'WH-002:80,WH-003:60',
    vehicle_capacity_units: 180,
    max_stops: 10,
    speed_kmh: 45,
    cost_per_km: 1.5,
    persist_schedule: true,
    minimize_carbon_footprint: false,
  });
  const [result, setResult] = useState<RouteOptimizeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setIsSubmitting(true);

    try {
      const deliveries = payload.deliveries
        .split(',')
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .map((part) => {
          const [warehouse_code, units] = part.split(':');
          return { warehouse_code: warehouse_code.trim(), demand_units: Number(units) };
        });

      const response = await optimizeRoute({
        route_name: payload.route_name,
        schedule_date: payload.schedule_date,
        start_warehouse_code: payload.start_warehouse_code,
        deliveries,
        vehicle_capacity_units: Number(payload.vehicle_capacity_units),
        max_stops: Number(payload.max_stops),
        speed_kmh: Number(payload.speed_kmh),
        cost_per_km: Number(payload.cost_per_km),
        persist_schedule: payload.persist_schedule,
        minimize_carbon_footprint: payload.minimize_carbon_footprint,
      });

      setPreviousResult(result);
      setResult(response);
      onOptimized?.(response);
      // m6/activation state reflects without a page reload.
      queryClient.invalidateQueries({ queryKey: ['activation'] });
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to optimize route'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldClassName = 'fp-input min-h-10';
  const previousDistanceDelta = previousResult && result ? result.total_distance_km - previousResult.total_distance_km : null;
  const previousCostDelta = previousResult && result ? result.total_cost - previousResult.total_cost : null;

  return (
    <Panel
      eyebrow="Plan a route"
      title="Plan the best delivery order"
      description="Enter the stops, vehicle size, and travel costs. We will suggest a route and show the stop order."
    >
      <form onSubmit={onSubmit} className="space-y-7">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <p className="col-span-full text-xs font-semibold text-[#73736e]">Route details</p>
          <label className="grid gap-1.5 text-xs font-medium text-[#40534c]">
            Route name
            <input className={fieldClassName} value={payload.route_name} onChange={(e) => setPayload({ ...payload, route_name: e.target.value })} />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-[#40534c]">
            Schedule date
            <input className={fieldClassName} type="date" value={payload.schedule_date} onChange={(e) => setPayload({ ...payload, schedule_date: e.target.value })} />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-[#40534c]">
            Start warehouse code
            <input className={fieldClassName} value={payload.start_warehouse_code} onChange={(e) => setPayload({ ...payload, start_warehouse_code: e.target.value })} />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <p className="col-span-full text-xs font-semibold text-[#73736e]">Stops and vehicles</p>
          <label className="grid gap-1.5 text-xs font-medium text-[#40534c]">
            Deliveries
            <input className={fieldClassName} value={payload.deliveries} onChange={(e) => setPayload({ ...payload, deliveries: e.target.value })} placeholder="WH-002:80,WH-003:60" />
            <span className="text-[11px] font-normal text-[#63766f]">Up to 200 comma-separated warehouse demand entries.</span>
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-[#40534c]">
            Vehicle capacity
            <input className={fieldClassName} type="number" min={1} value={payload.vehicle_capacity_units} onChange={(e) => setPayload({ ...payload, vehicle_capacity_units: Number(e.target.value) })} />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-[#40534c]">
            Max stops
            <input className={fieldClassName} type="number" min={1} max={100} value={payload.max_stops} onChange={(e) => setPayload({ ...payload, max_stops: Number(e.target.value) })} />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <p className="col-span-full text-xs font-semibold text-[#73736e]">Plan settings</p>
          <label className="grid gap-1.5 text-xs font-medium text-[#40534c]">
            Speed km/h
            <input className={fieldClassName} type="number" step="0.1" value={payload.speed_kmh} onChange={(e) => setPayload({ ...payload, speed_kmh: Number(e.target.value) })} />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-[#40534c]">
            Cost per km
            <input className={fieldClassName} type="number" step="0.1" value={payload.cost_per_km} onChange={(e) => setPayload({ ...payload, cost_per_km: Number(e.target.value) })} />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <p className="col-span-full text-xs font-semibold text-[#73736e]">Save this plan</p>
          <label className="col-span-1 flex items-center gap-3 py-1 text-xs text-[#454540]">
            <input type="checkbox" checked={payload.persist_schedule} onChange={(e) => setPayload({ ...payload, persist_schedule: e.target.checked })} />
            Save this route so the rest of the team can use it.
          </label>
          <label className="col-span-1 flex items-center gap-3 py-1 text-xs text-[#454540]">
            <input type="checkbox" checked={payload.minimize_carbon_footprint} onChange={(e) => setPayload({ ...payload, minimize_carbon_footprint: e.target.checked })} />
            Choose the lower-emission route
          </label>
        </div>

        <button
          disabled={isSubmitting}
          className="fp-action-primary w-full"
        >
          {isSubmitting ? (
            <svg className="animate-spin-slow h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="50 20" /></svg>
          ) : null}
          {isSubmitting ? 'Planning route...' : 'Plan route'}
        </button>
      </form>

      {error ? <p role="alert" className="mt-3 border border-[#e7c2be] bg-[#fff8f7] px-3 py-2 text-sm text-[#8f302a]">{error}</p> : null}

      {result ? (
        <div className="animate-slide-up mt-5 space-y-4 border-t border-[#d7dfdc] pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={result.objective} tone="info" />
            <StatusBadge label={result.unassigned_deliveries.length === 0 ? 'Fully assigned' : 'Review unassigned'} tone={result.unassigned_deliveries.length === 0 ? 'success' : 'warning'} />
            {result.co2_saved_kg && result.co2_saved_kg > 0 ? (
              <StatusBadge label={`${result.co2_saved_kg} kg CO2 Saved`} tone="success" />
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            {[
              { label: 'Distance', value: `${result.total_distance_km} km` },
              { label: 'Cost', value: `${result.total_cost.toLocaleString()} route units` },
              { label: 'Duration', value: `${result.estimated_duration_min} min` },
              { label: 'Stops', value: String(result.stops.length) },
            ].map((stat) => (
              <div key={stat.label} className="border-b border-[#efeeea] py-2">
                <p className="text-xs text-[#73736e]">{stat.label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-[#252522]">{stat.value}</p>
              </div>
            ))}
          </div>

          {previousResult ? (
            <div className="rounded-md bg-[#f7f7f5] px-3 py-2.5 text-xs text-[#5f5f59]">
              Compared with your last plan:{' '}
              <span className={`font-mono font-semibold tabular-nums ${previousDistanceDelta != null && previousDistanceDelta < 0 ? 'text-[#14745f]' : 'text-[#20372f]'}`}>
                {previousDistanceDelta == null ? 'N/A' : `${previousDistanceDelta >= 0 ? '+' : ''}${previousDistanceDelta.toFixed(1)} km`}
              </span>
              {' | '}
              <span className={`font-mono font-semibold tabular-nums ${previousCostDelta != null && previousCostDelta < 0 ? 'text-[#14745f]' : 'text-[#20372f]'}`}>
                {previousCostDelta == null ? 'N/A' : `${previousCostDelta >= 0 ? '+' : ''}${previousCostDelta.toFixed(2)} ETB`}
              </span>
            </div>
          ) : null}

          <RouteDecisionBrief explanation={result.decision_explanation} />

          <div>
            <p className="text-xs font-semibold text-[#73736e]">Stop sequence</p>
            <ul className="mt-2 grid gap-1 text-xs text-[#40534c]">
              {result.stops.map((stop) => (
                <li key={stop.sequence} className="border-b border-[#e6ebe8] px-2 py-1.5 last:border-b-0">
                  <span className="font-mono font-semibold text-[#20372f]">#{stop.sequence}</span> {stop.warehouse_code} · {stop.demand_units} units · {stop.leg_distance_km} km leg
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}


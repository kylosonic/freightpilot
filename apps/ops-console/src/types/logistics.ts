import type { JsonValue } from './common';

export type InventoryOverviewRow = {
  warehouse_code: string;
  warehouse_name: string;
  total_quantity_on_hand: number;
  total_safety_stock: number;
  utilization_percent: number;
};

export type ForecastPoint = {
  week_start: string;
  warehouse_code: string;
  sku: string;
  predicted_demand: number;
  planning_low: number;
  planning_high: number;
};

export type ForecastQuality = {
  status: 'validated' | 'limited' | 'insufficient_history';
  history_weeks: number;
  holdout_weeks: number;
  evaluated_rows: number;
  mae: number | null;
  wape_percent: number | null;
  range_basis: string;
  interpretation: string;
  caveat: string;
};

export type ForecastResponse = {
  horizon_weeks: number;
  model_name: string;
  points: ForecastPoint[];
  quality: ForecastQuality;
};

export type RouteStop = {
  sequence: number;
  warehouse_code: string;
  demand_units: number;
  leg_distance_km: number;
  cumulative_distance_km: number;
  latitude?: number;
  longitude?: number;
  estimated_arrival?: string;
};

export type RouteScheduleSummary = {
  id: string;
  route_name: string;
  schedule_date: string;
  total_distance_km: number;
  total_cost: number;
  estimated_duration_min: number;
  status: string;
};

export type DispatchLiveRun = {
  id: string;
  route_name: string;
  plan_date: string;
  status: string;
  driver_id: string | null;
  driver_name: string | null;
  total_stops: number;
  terminal_stops: number;
  progress_percent: number;
  expected_cash_etb: string;
  collected_cash_etb: string;
  cash_declared_etb: string | null;
  cash_handed_over_etb: string | null;
  cash_shortfall_etb: string | null;
  cash_overage_etb: string | null;
  cash_deposit_bank: string | null;
  cash_deposit_reference: string | null;
  cash_closed_at: string | null;
  updated_at: string | null;
};

export type DispatchLiveOverview = {
  updated_at: string | null;
  runs: DispatchLiveRun[];
};

export type RouteOptimizeResponse = {
  route_name: string;
  schedule_date: string;
  objective: string;
  total_distance_km: number;
  total_cost: number;
  estimated_duration_min: number;
  capacity_used: number;
  unassigned_deliveries: { warehouse_code: string; demand_units: number }[];
  stops: RouteStop[];
  co2_saved_kg?: number | null;
  post_aha_toast?: boolean;
  data_origin?: string | null;
  decision_explanation?: RouteDecisionExplanation | null;
};

export type RouteFactorShare = {
  distance: number;
  time: number;
  cost: number;
};

export type RouteDecisionPoint = {
  sequence: number;
  chosen_warehouse_code: string;
  chosen_weighted_cost: number;
  runner_up_warehouse_code: string | null;
  runner_up_weighted_cost: number | null;
  margin: number | null;
  dominant_factor: string;
  capacity_excluded_count: number;
  reason: string;
};

export type RouteAlternativeSummary = {
  first_stop_warehouse_code: string;
  total_distance_km: number;
  estimated_duration_min: number;
  total_cost: number;
  distance_delta_km: number;
  duration_delta_min: number;
  cost_delta: number;
  summary: string;
};

export type RouteDecisionExplanation = {
  method: string;
  summary: string;
  dominant_factor: string;
  factor_share_pct: RouteFactorShare;
  constraints: string[];
  decision_points: RouteDecisionPoint[];
  runner_up: RouteAlternativeSummary | null;
  limitations: string[];
};

export type RouteOptimizePayload = {
  route_name: string;
  schedule_date: string;
  start_warehouse_code: string;
  deliveries: { warehouse_code: string; demand_units: number }[];
  vehicle_capacity_units: number;
  max_stops: number;
  speed_kmh: number;
  cost_per_km: number;
  persist_schedule: boolean;
  minimize_carbon_footprint: boolean;
};

export type RouteOptimizationRunSummary = {
  id: string;
  created_at: string;
  route_name: string;
  schedule_date: string;
  start_warehouse_code: string;
  objective: string;
  total_distance_km: number;
  total_cost: number;
  estimated_duration_min: number;
  capacity_used: number;
  deliveries_count: number;
  stops_count: number;
  unassigned_count: number;
  persist_requested: boolean;
  persisted_schedule_id: string | null;
};

export type RouteOptimizationRunDetail = RouteOptimizationRunSummary & {
  actor_user_id: string | null;
  organization_id: string | null;
  vehicle_capacity_units: number;
  max_stops: number;
  speed_kmh: number;
  cost_per_km: number;
  weights: {
    distance: number;
    time: number;
    cost: number;
  };
  deliveries: { warehouse_code: string; demand_units: number }[];
  stops: RouteStop[];
  unassigned_deliveries: { warehouse_code: string; demand_units: number }[];
  decision_explanation?: RouteDecisionExplanation | null;
};

export type ShipmentStatus = 'planned' | 'in_transit' | 'delivered' | 'delayed' | 'cancelled';

export type Shipment = {
  id: string;
  created_at: string;
  shipment_no: string;
  route_schedule_id: string | null;
  origin_warehouse_code: string;
  destination_warehouse_code: string;
  sku: string;
  quantity_units: number;
  planned_departure: string | null;
  expected_delivery: string | null;
  actual_delivery: string | null;
  status: ShipmentStatus;
  last_known_location: string | null;
  delay_reason: string | null;
  proof_of_delivery_ref: string | null;
  /** NB-86: who is carrying it, and the cash expected at the door. */
  driver_id: string | null;
  driver_name: string | null;
  cod_amount_etb: string;
  client_ref: string | null;
};

export type AlertStatus = 'open' | 'acknowledged' | 'resolved';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertType = 'low_stock' | 'delayed_shipment' | 'planning_exception' | 'manual';

export type Alert = {
  id: string;
  created_at: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  acknowledged_by_user_id: string | null;
  acknowledged_at: string | null;
  resolved_by_user_id: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  /**
   * Server-computed extras attached to an alert. The re-routing plan is the
   * only member the console reads; it is an opaque server payload, so it is
   * typed as a recursive JSON value rather than `any` (NB-77 lint gate).
   */
  payload?: { rerouting_plan?: JsonValue; [key: string]: JsonValue | undefined } | null;
};

export type ReplenishmentPlanStatus = 'pending_approval' | 'approved' | 'rejected';

export type ReplenishmentPlan = {
  id: string;
  created_at: string;
  warehouse_code: string;
  sku: string;
  horizon_weeks: number;
  avg_weekly_demand: number;
  suggested_quantity: number;
  approved_quantity: number | null;
  status: ReplenishmentPlanStatus;
  rationale: string;
  created_by_user_id: string;
  approved_by_user_id: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
};

export type Customer = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  address: string;
  latitude: number;
  longitude: number;
  notes: string | null;
};

export type DeliveryOrder = {
  id: string;
  order_no: string;
  customer_id: string;
  customer_code: string | null;
  customer_name: string | null;
  quantity_units: number;
  cod_amount_etb: string;
  window_start: string | null;
  window_end: string | null;
  service_minutes: number;
  priority: number;
  stop_sequence: number | null;
  status: string;
  completed_at: string | null;
  collected_cash_etb: string;
  cash_declared_at: string | null;
  cash_settled_at: string | null;
  notes: string | null;
};

export type DispatchStop = {
  order_id: string;
  order_no: string;
  customer_code: string;
  customer_name: string;
  address: string;
  phone: string | null;
  latitude: number;
  longitude: number;
  sequence: number;
  planned_arrival: string;
  window_start: string | null;
  window_end: string | null;
  demand_units: number;
  cod_amount_etb: string;
  status: string;
  completed_at: string | null;
  collected_cash_etb: string;
  proof_id: string | null;
};

export type DispatchRun = {
  id: string;
  route_name: string;
  plan_date: string;
  start_label: string;
  vehicle_capacity_units: number;
  max_stops: number;
  total_distance_km: number;
  estimated_duration_min: number;
  expected_cash_etb: string;
  status: string;
  driver_id: string | null;
  cash_closed_at: string | null;
  cash_closed_by_user_id: string | null;
  cash_declared_etb: string | null;
  cash_handed_over_etb: string | null;
  cash_shortfall_etb: string | null;
  cash_overage_etb: string | null;
  cash_deposit_bank: string | null;
  cash_deposit_reference: string | null;
  cash_close_note: string | null;
  stops?: DispatchStop[];
  unassigned?: { order_id: string; order_no: string; reason: string }[];
};

export type FleetDispatchPlanResponse = {
  runs: DispatchRun[];
  unassigned: { order_id: string; order_no: string; reason: string }[];
};

export type DriverManifest = {
  run_id: string;
  route_name: string;
  plan_date: string;
  driver_id: string;
  driver_name: string;
  start_label: string;
  stops: DispatchStop[];
};

export type DriverLink = {
  token: string;
  driver_url: string;
  expires_at: string;
};

export type CustomerTrackingLink = {
  token: string;
  tracking_url: string;
  expires_at: string;
};

export type CustomerTrackingView = {
  order_no: string;
  customer_name: string;
  status: string;
  route_name: string | null;
  driver_name: string | null;
  planned_arrival: string | null;
  window_start: string | null;
  window_end: string | null;
  proof_available: boolean;
  updated_at: string | null;
};

export type CashCloseSummary = {
  run_id: string;
  expected_etb: string;
  collected_etb: string;
  declared_etb: string;
  handed_over_etb: string;
  shortfall_etb: string;
  overage_etb: string;
  deposit_bank: string | null;
  deposit_reference: string | null;
  note: string | null;
  terminal_stops: number;
  total_stops: number;
  closed_at: string;
};

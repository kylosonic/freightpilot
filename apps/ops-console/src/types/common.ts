/** Any JSON value as it arrives from the server (no `any` on the wire). */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type AuditEvent = {
  id: string;
  created_at: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  actor_user_id: string | null;
  organization_id: string | null;
  description: string;
  payload: Record<string, unknown> | unknown[] | null;
};

export type ExceptionFeedItem = {
  source_type: string;
  source_id: string;
  severity: string;
  status: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

export type ExceptionFeedSummary = {
  open_alerts: number;
  delayed_shipments: number;
  pending_replenishment_plans: number;
  route_runs_with_unassigned_deliveries: number;
};

export type ExceptionFeedResponse = {
  summary: ExceptionFeedSummary;
  items: ExceptionFeedItem[];
};

export type IngestionResult = {
  records_processed: number;
  records_created: number;
  records_updated: number;
  errors: string[];
};

export type WeatherRiskZone = {
  id: string;
  severity_score: number;
  polygon: [number, number][];
  source?: 'simulated' | 'live';
};

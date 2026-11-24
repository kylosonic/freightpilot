export type DecisionEvidence = {
  record_type: string;
  record_id: string | null;
  label: string;
  value: string | number | null;
};

export type DecisionRisk = {
  kind: string;
  severity: string;
  message: string;
  evidence: DecisionEvidence[];
};

export type DecisionAction = {
  priority: number;
  action: string;
  reason: string;
  href: string | null;
  evidence: DecisionEvidence[];
};

export type CashRiskRow = {
  driver_id: string | null;
  driver_name: string;
  outstanding_count: number;
  expected_etb: string;
  collected_etb: string;
  shortfall_etb: string;
  risk_score: number;
  factors: string[];
};

export type ExceptionTriageRow = {
  alert_id: string;
  title: string;
  severity: string;
  age_hours: number;
  priority: number;
  suggested_action: string;
  evidence: DecisionEvidence[];
};

export type DecisionBrief = {
  generated_at: string;
  generated_by: string;
  headline: string;
  what_changed: string[];
  risks: DecisionRisk[];
  actions: DecisionAction[];
  cash_risk: CashRiskRow[];
  triage: ExceptionTriageRow[];
};

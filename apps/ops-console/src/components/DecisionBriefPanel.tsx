import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { getDecisionBrief } from '../services/insightsApi';
import type { DecisionBrief, DecisionEvidence } from '../types/api';
import { Panel } from './ui/Panel';
import { StatusBadge } from './ui/StatusBadge';

function tone(value: string): 'danger' | 'warning' | 'info' {
  if (value === 'critical' || value === 'high') return 'danger';
  if (value === 'medium') return 'warning';
  return 'info';
}

function Evidence({ rows }: { rows: DecisionEvidence[] }) {
  if (rows.length === 0) return null;
  return (
    <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#63766f]">
      {rows.map((row, index) => (
        <li key={`${row.record_type}:${row.record_id ?? row.label}:${index}`}>
          {row.label}
          {row.value !== null ? `: ${row.value}` : ''}
        </li>
      ))}
    </ul>
  );
}

export function DecisionBriefContent({
  brief,
  isLoading = false,
  error = null,
}: {
  brief?: DecisionBrief;
  isLoading?: boolean;
  error?: unknown;
}) {
  if (isLoading) {
    return (
      <Panel eyebrow="Decision brief" title="Reading the workspace">
        <p className="text-xs text-[#63766f]">Building a record-grounded brief…</p>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel eyebrow="Decision brief" title="Brief unavailable">
        <p className="text-sm text-[#8f302a]">
          The brief could not be built from workspace records. No recommendation is being shown.
        </p>
      </Panel>
    );
  }

  if (!brief) return null;

  return (
    <Panel
      eyebrow="Grounded decision brief"
      title={brief.headline}
      description="Every statement below comes from a workspace record or a calculated count. Recommendations are advisory and require human action."
    >
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7d76]">What changed</h3>
            <ul className="mt-1.5 space-y-1 text-xs leading-5 text-[#40534c]">
              {brief.what_changed.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </section>

          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7d76]">What is at risk</h3>
            <div className="mt-2 space-y-2">
              {brief.risks.length === 0 ? (
                <p className="text-xs text-[#14745f]">No grounded operating risk is currently recorded.</p>
              ) : null}
              {brief.risks.map((risk) => (
                <article key={risk.kind} className="border-t border-[#e6ebe8] py-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge label={risk.severity} tone={tone(risk.severity)} />
                    <span className="text-[10px] uppercase tracking-wide text-[#6b7d76]">{risk.kind}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#40534c]">{risk.message}</p>
                  <Evidence rows={risk.evidence} />
                </article>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7d76]">Recommended next actions</h3>
            <div className="mt-2 space-y-2">
              {brief.actions.length === 0 ? (
                <p className="text-xs text-[#63766f]">No action is recommended from the current records.</p>
              ) : null}
              {brief.actions.map((action) => (
                <article key={`${action.priority}:${action.action}`} className="border-t border-[#e6ebe8] py-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold text-[#20372f]">{action.action}</p>
                    <span className="border border-[#d7dfdc] px-1.5 py-0.5 font-mono text-[10px] text-[#63766f]">
                      P{action.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#63766f]">{action.reason}</p>
                  <Evidence rows={action.evidence} />
                  {action.href ? (
                    <Link to={action.href} className="mt-1.5 inline-block text-[11px] font-semibold text-[#087f72] underline-offset-4 hover:underline">
                      Review the record →
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7d76]">Cash risk</h3>
              <span className="text-[10px] text-[#63766f]">Rules-based</span>
            </div>
            <div className="mt-2 space-y-2">
              {brief.cash_risk.length === 0 ? (
                <p className="text-xs text-[#63766f]">No open driver cash exposure is recorded.</p>
              ) : null}
              {brief.cash_risk.map((row) => (
                <article key={row.driver_id ?? row.driver_name} className="border-t border-[#e6ebe8] py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-[#20372f]">{row.driver_name}</p>
                    <span className="font-mono text-xs font-semibold tabular-nums text-[#885100]">{row.risk_score}/100</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#63766f]">
                    {row.shortfall_etb} ETB shortfall · {row.outstanding_count} open stop(s)
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#6b7d76]">{row.factors.join(' · ')}</p>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7d76]">Exception triage</h3>
            <div className="mt-2 space-y-2">
              {brief.triage.length === 0 ? (
                <p className="text-xs text-[#63766f]">No open exception needs triage.</p>
              ) : null}
              {brief.triage.map((row) => (
                <article key={row.alert_id} className="border-t border-[#e6ebe8] py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={row.severity} tone={tone(row.severity)} />
                    <p className="text-xs font-semibold text-[#20372f]">{row.title}</p>
                    <span className="ml-auto font-mono text-[10px] tabular-nums text-[#63766f]">P{row.priority}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-[#63766f]">{row.age_hours}h open</p>
                  <p className="mt-0.5 text-[11px] text-[#40534c]">{row.suggested_action}</p>
                  <Evidence rows={row.evidence} />
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
      <p className="mt-3 border-t border-[#e6ebe8] pt-2.5 text-[10px] text-[#6b7d76]">
        Source: {brief.generated_by} · generated {new Date(brief.generated_at).toLocaleString()}
      </p>
    </Panel>
  );
}

export function DecisionBriefPanel() {
  const query = useQuery({
    queryKey: ['ops', 'decision-brief'],
    queryFn: getDecisionBrief,
    staleTime: 30_000,
  });

  return <DecisionBriefContent brief={query.data} isLoading={query.isLoading} error={query.error} />;
}

import type { DispatchRun } from '../../types/api';
import { Panel } from '../ui/Panel';
import { StatusBadge } from '../ui/StatusBadge';

type DispatchRunsListProps = {
  liveUpdatedAt: string | null;
  runs: DispatchRun[];
  canCloseCash: boolean;
  expandedRunId: string | null;
  expandedRun: DispatchRun | null;
  expandedLoading: boolean;
  onToggleRun: (runId: string) => void;
  onDriverLink: (runId: string) => void;
  onOpenCashClose: (run: DispatchRun) => void;
  onCustomerTrackingLink: (orderId: string) => void;
  onViewProof: (orderId: string, proofId: string) => void;
};

export function DispatchRunsList({
  liveUpdatedAt,
  runs,
  canCloseCash,
  expandedRunId,
  expandedRun,
  expandedLoading,
  onToggleRun,
  onDriverLink,
  onOpenCashClose,
  onCustomerTrackingLink,
  onViewProof,
}: DispatchRunsListProps) {
  return (
    <Panel eyebrow="Runs" title="Dispatch runs" description="Open a driver link, monitor stop status, or close the day’s cash.">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 text-xs" aria-live="polite">
          <span className="flex items-center gap-2 text-[#5f5f59]">
            <span className={`h-2 w-2 rounded-full ${liveUpdatedAt ? 'bg-[#16856b]' : 'bg-[#a8a7a1]'}`} />
            {liveUpdatedAt ? 'Live dispatch sync' : 'Waiting for live dispatch updates'}
          </span>
          {liveUpdatedAt ? (
            <span className="text-[#73736e]">
              {new Date(liveUpdatedAt).toLocaleTimeString()}
            </span>
          ) : null}
        </div>
        {runs.length === 0 ? <p className="text-xs text-[#73736e]">No dispatch runs yet.</p> : null}
        {runs.map((run) => (
          <article key={run.id} className="border-b border-[#e5e4e0] pb-3 last:border-b-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#252522]">{run.route_name}</h3>
                  <StatusBadge label={run.status} tone={run.status === 'closed' ? 'success' : 'info'} />
                </div>
                <p className="mt-0.5 text-[11px] text-[#5f5f59]">
                  {run.plan_date} · {run.total_distance_km} km · {run.estimated_duration_min} min · {run.expected_cash_etb} ETB expected
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onToggleRun(run.id)} className="fp-action-secondary !min-h-8 text-xs">
                  {expandedRunId === run.id ? 'Hide stops' : 'View stops'}
                </button>
                {run.driver_id ? <button type="button" onClick={() => onDriverLink(run.id)} className="fp-action-quiet !min-h-8 !text-[#17679b]">Create driver link</button> : null}
                {run.status !== 'closed' && canCloseCash ? <button type="button" onClick={() => onOpenCashClose(run)} className="fp-action-quiet !min-h-8 !text-[#14745f]">Close cash</button> : null}
              </div>
            </div>
            {expandedRunId === run.id ? (
              <div className="mt-3 space-y-2 border-t border-[#efeeea] pt-3">
                {expandedLoading ? <p className="text-xs text-[#73736e]">Loading stops…</p> : null}
                {expandedRun?.stops?.map((stop) => (
                  <div key={stop.order_id} className="flex flex-wrap items-center justify-between gap-2 border-t border-[#efeeea] px-1 py-2 first:border-t-0">
                    <div>
                      <p className="text-xs text-[#252522]">#{stop.sequence} · {stop.order_no} · {stop.customer_name}</p>
                      <p className="text-[11px] text-[#5f5f59]">
                        {stop.status.replace(/_/g, ' ')} · {stop.collected_cash_etb} ETB collected · window{' '}
                        {stop.window_start ? new Date(stop.window_start).toLocaleTimeString() : '—'}
                        {' – '}
                        {stop.window_end ? new Date(stop.window_end).toLocaleTimeString() : '—'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => onCustomerTrackingLink(stop.order_id)} className="fp-action-quiet !min-h-8 !text-[#14745f]">
                        Customer link
                      </button>
                      {stop.proof_id ? (
                        <button type="button" onClick={() => onViewProof(stop.order_id, stop.proof_id!)} className="fp-action-quiet !min-h-8 !text-[#17679b]">
                          View proof
                        </button>
                      ) : <span className="text-[10px] text-[#73736e]">No proof</span>}
                    </div>
                  </div>
                ))}
                {expandedRun && expandedRun.stops?.length === 0 ? <p className="text-xs text-[#73736e]">No stops recorded.</p> : null}
                {expandedRun?.unassigned && expandedRun.unassigned.length > 0 ? (
                  <div className="rounded-md bg-[#fffaf0] p-3">
                    <p className="text-xs font-semibold text-[#885100]">
                      Unassigned to this run
                    </p>
                    <ul className="mt-1 space-y-1 text-[11px] text-[#704500]">
                      {expandedRun.unassigned.map((item) => (
                        <li key={item.order_id}>{item.order_no}: {item.reason}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </Panel>
  );
}

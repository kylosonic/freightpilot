import type { RouteDecisionExplanation } from '../types/api';

const FACTOR_LABELS: Record<string, string> = {
  distance: 'Distance',
  time: 'Travel time',
  cost: 'Monetary cost',
  none: 'No weighted factor',
};

const FACTOR_COLORS: Record<string, string> = {
  distance: 'bg-[#17679b]',
  time: 'bg-[#16856b]',
  cost: 'bg-[#a15b00]',
  none: 'bg-[#a8a7a1]',
};

export function RouteDecisionBrief({
  explanation,
}: {
  explanation?: RouteDecisionExplanation | null;
}) {
  if (!explanation) {
    return (
      <div className="rounded-md border border-dashed border-[#e5e4e0] bg-[#f7f7f5] px-3 py-2.5">
        <p className="text-xs font-semibold text-[#454540]">Why this route</p>
        <p className="mt-1 text-sm text-[#5f5f59]">
          This plan has no explanation. New plans include one automatically.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-md border border-[#cfe0ea] bg-[#f7fafc] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-[#17679b]">Why this route</p>
          <h3 className="mt-1 text-lg font-semibold text-[#252522]">
            {FACTOR_LABELS[explanation.dominant_factor] ?? explanation.dominant_factor} led this plan
          </h3>
        </div>
        <span className="rounded-full border border-[#e5e4e0] bg-white px-2 py-0.5 text-[10px] font-medium text-[#73736e]">
          Based on this plan
        </span>
      </div>

      <p className="mt-2 text-xs leading-5 text-[#454540]">{explanation.summary}</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {(['distance', 'time', 'cost'] as const).map((factor) => (
          <div key={factor} className="rounded-md border border-[#e5e4e0] bg-white px-2.5 py-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-[#5f5f59]">{FACTOR_LABELS[factor]}</span>
              <span className="font-mono tabular-nums text-[#252522]">
                {explanation.factor_share_pct[factor].toFixed(1)}%
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#efeeea]">
              <div
                className={`h-full rounded-full ${FACTOR_COLORS[factor]}`}
                style={{ width: `${Math.min(100, Math.max(0, explanation.factor_share_pct[factor]))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {explanation.constraints.length > 0 ? (
        <div className="mt-2 rounded-md border border-[#e7d1a8] bg-[#fffaf0] px-2.5 py-2">
          <p className="text-xs font-semibold text-[#885100]">Rules followed</p>
          <ul className="mt-1 space-y-1 text-xs text-[#704500]">
            {explanation.constraints.map((constraint) => (
              <li key={constraint}>{constraint}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {explanation.runner_up ? (
        <div className="mt-2 rounded-md border border-[#e5e4e0] bg-white px-2.5 py-2">
          <p className="text-xs font-semibold text-[#5f5f59]">Next best route</p>
          <p className="mt-1 text-xs text-[#454540]">{explanation.runner_up.summary}</p>
        </div>
      ) : null}

      {explanation.decision_points.length > 0 ? (
        <details className="mt-2 rounded-md border border-[#e5e4e0] bg-white px-2.5 py-2">
          <summary className="cursor-pointer text-xs font-semibold text-[#454540]">
            Why each stop came next ({explanation.decision_points.length})
          </summary>
          <ol className="mt-3 space-y-2">
            {explanation.decision_points.map((point) => (
              <li key={point.sequence} className="border-t border-[#efeeea] pt-1.5 text-xs text-[#5f5f59] first:border-t-0 first:pt-0">
                <span className="font-semibold text-[#252522]">#{point.sequence} {point.chosen_warehouse_code}</span>
                {' — '}
                {point.reason}
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      <p className="mt-3 text-[11px] leading-5 text-[#73736e]">{explanation.limitations.join(' ')}</p>
    </section>
  );
}

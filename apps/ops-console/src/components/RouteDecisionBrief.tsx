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
  none: 'bg-[#a9bbb4]',
};

export function RouteDecisionBrief({
  explanation,
}: {
  explanation?: RouteDecisionExplanation | null;
}) {
  if (!explanation) {
    return (
      <div className="border border-dashed border-[#c8d4cf] bg-[#f8faf9] px-3 py-2.5">
        <p className="text-xs font-semibold text-[#40534c]">Why this route</p>
        <p className="mt-1 text-sm text-[#63766f]">
          This plan has no explanation. New plans include one automatically.
        </p>
      </div>
    );
  }

  return (
    <section className="border border-[#bfd8e5] bg-[#f8fbfc] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-[#17679b]">Why this route</p>
          <h3 className="mt-1 text-lg font-semibold text-[#172a24]">
            {FACTOR_LABELS[explanation.dominant_factor] ?? explanation.dominant_factor} led this plan
          </h3>
        </div>
        <span className="border border-[#d7dfdc] bg-white px-2 py-0.5 text-[10px] font-medium text-[#63766f]">
          Based on this plan
        </span>
      </div>

      <p className="mt-2 text-xs leading-5 text-[#40534c]">{explanation.summary}</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {(['distance', 'time', 'cost'] as const).map((factor) => (
          <div key={factor} className="border border-[#d7dfdc] bg-white px-2.5 py-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-[#63766f]">{FACTOR_LABELS[factor]}</span>
              <span className="font-mono tabular-nums text-[#20372f]">
                {explanation.factor_share_pct[factor].toFixed(1)}%
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden bg-[#dce8e3]">
              <div
                className={`h-full rounded-full ${FACTOR_COLORS[factor]}`}
                style={{ width: `${Math.min(100, Math.max(0, explanation.factor_share_pct[factor]))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {explanation.constraints.length > 0 ? (
        <div className="mt-2 border border-[#e7d1a8] bg-[#fffaf0] px-2.5 py-2">
          <p className="text-xs font-semibold text-[#885100]">Rules followed</p>
          <ul className="mt-1 space-y-1 text-xs text-[#704500]">
            {explanation.constraints.map((constraint) => (
              <li key={constraint}>{constraint}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {explanation.runner_up ? (
        <div className="mt-2 border border-[#d7dfdc] bg-white px-2.5 py-2">
          <p className="text-xs font-semibold text-[#63766f]">Next best route</p>
          <p className="mt-1 text-xs text-[#40534c]">{explanation.runner_up.summary}</p>
        </div>
      ) : null}

      {explanation.decision_points.length > 0 ? (
        <details className="mt-2 border border-[#d7dfdc] bg-white px-2.5 py-2">
          <summary className="cursor-pointer text-xs font-semibold text-[#40534c]">
            Why each stop came next ({explanation.decision_points.length})
          </summary>
          <ol className="mt-3 space-y-2">
            {explanation.decision_points.map((point) => (
              <li key={point.sequence} className="border-t border-[#e6ebe8] pt-1.5 text-xs text-[#63766f] first:border-t-0 first:pt-0">
                <span className="font-semibold text-[#20372f]">#{point.sequence} {point.chosen_warehouse_code}</span>
                {' — '}
                {point.reason}
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      <p className="mt-3 text-[11px] leading-5 text-[#63766f]">{explanation.limitations.join(' ')}</p>
    </section>
  );
}

import { includedTasksLabel, overageCostLabel, overageRateLabel, planPriceLabel } from '../../pages/accountUsageUtils';
import type { CurrentSubscription, SubscriptionPlan, SubscriptionTier, UsageSummary } from '../../types/api';
import { Panel } from '../ui/Panel';
import { StatusBadge } from '../ui/StatusBadge';

type PlanComparisonSectionProps = {
  tierLabel: string;
  subscription: CurrentSubscription | null;
  usage: UsageSummary | null;
  metricLabel: string;
  progressPercent: number;
  plans: SubscriptionPlan[];
  currentTier?: SubscriptionTier;
  savingTier: SubscriptionTier | null;
  onRefreshUsage: () => void;
  onSelectTier: (tier: SubscriptionTier) => void;
};

export function PlanComparisonSection({
  tierLabel,
  subscription,
  usage,
  metricLabel,
  progressPercent,
  plans,
  currentTier,
  savingTier,
  onRefreshUsage,
  onSelectTier,
}: PlanComparisonSectionProps) {
  return (
    <Panel
      eyebrow="Billing"
      title="Plan and usage"
      description="Change your plan, check how much you have used, and review what each tier includes."
      actions={
        <button
          type="button"
          onClick={onRefreshUsage}
          className="fp-action-quiet !min-h-8"
        >
          Refresh usage
        </button>
      }
    >
      <div className="rounded-md bg-[#f7f7f5] p-3">
        <p className="text-sm font-semibold text-[#252522]">{tierLabel} plan</p>
        <p className="mt-1 text-xs text-[#5f5f59]">{subscription?.organization_name ?? 'Workspace name not loaded'}</p>
      </div>

      <div className="mt-3 border-t border-[#e5e4e0] pt-3">
        <p className="text-xs font-semibold text-[#252522]">Tasks used this month</p>
        <p className="mt-0.5 text-[11px] text-[#73736e]">{metricLabel} counts toward your plan limit.</p>

        {usage ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-2 text-xs text-[#5f5f59] md:grid-cols-3">
              <p>
                Period: <span className="font-semibold text-[#252522]">{usage.period_start}</span> to{' '}
                <span className="font-semibold text-[#252522]">{usage.period_end}</span>
              </p>
              <p>
                Used: <span className="font-mono font-semibold tabular-nums text-[#252522]">{usage.used_units.toLocaleString()}</span>
              </p>
              <p>
                Included:{' '}
                <span className="font-mono font-semibold tabular-nums text-[#252522]">
                  {usage.included_units == null ? 'Unlimited' : usage.included_units.toLocaleString()}
                </span>
              </p>
            </div>

            {usage.included_units != null ? (
              <>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#e5e4e0]">
                  <div className="h-full bg-[#176b5c]" style={{ width: `${progressPercent}%` }} />
                </div>
                <p className="text-xs text-[#5f5f59]">
                  Used: <span className="font-mono font-semibold tabular-nums text-[#252522]">{usage.utilization_percent ?? 0}%</span>
                </p>
              </>
            ) : (
              <p className="text-xs text-[#73736e]">This plan has no monthly task limit.</p>
            )}

            <div className="grid gap-2 text-xs text-[#5f5f59] md:grid-cols-2">
              <p>
                Extra tasks: <span className="font-mono font-semibold tabular-nums text-[#252522]">{usage.overage_units.toLocaleString()}</span>
              </p>
              <p>
                Estimated extra cost:{' '}
                <span className="font-mono font-semibold tabular-nums text-[#252522]">
                  {overageCostLabel(usage)}
                </span>
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-[#73736e]">Usage could not be loaded. Refresh in a moment.</p>
        )}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <div key={plan.tier} className="flex flex-col justify-between border-t border-[#e5e4e0] pt-3">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#252522]">{plan.title}</h3>
                  <p className="font-mono text-xs tabular-nums text-[#5f5f59]">{planPriceLabel(plan)}</p>
                </div>
                {currentTier === plan.tier ? <StatusBadge label="Current" tone="info" /> : null}
              </div>
              <div className="mt-2 space-y-0.5 text-[11px] text-[#5f5f59]">
                {plan.tier !== 'free' || plan.seat_limit != null ? (
                  <p>Seats: <span className="font-mono tabular-nums">{plan.seat_limit ?? 'Unlimited'}</span></p>
                ) : null}
                {plan.tier !== 'free' || plan.vehicle_limit != null ? (
                  <p>Vehicles: <span className="font-mono tabular-nums">{plan.vehicle_limit ?? 'Unlimited'}</span></p>
                ) : null}
                <p>Included tasks: <span className="font-mono tabular-nums">{includedTasksLabel(plan)}</span></p>
                <p>Extra task rate: <span className="font-mono tabular-nums">{overageRateLabel(plan)}</span></p>
              </div>
            </div>
            <button
              type="button"
              disabled={currentTier === plan.tier || savingTier !== null}
              onClick={() => onSelectTier(plan.tier)}
              className="fp-action-secondary mt-3 w-full !min-h-8 text-xs"
            >
              {currentTier === plan.tier
                ? 'Current plan'
                : savingTier === plan.tier
                  ? 'Updating...'
                  : 'Switch to plan'}
            </button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

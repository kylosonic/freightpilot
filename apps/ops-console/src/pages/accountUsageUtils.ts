import type { SubscriptionPlan, UsageSummary } from '../types/api';

export function usageMetricLabel(usage: UsageSummary | null): string {
  if (!usage) {
    return 'Usage metrics unavailable';
  }
  if (usage.metric === 'delivery_tasks') {
    return 'Delivery tasks this billing month';
  }
  return usage.metric;
}

export function usageProgressPercent(usage: UsageSummary | null): number {
  if (!usage?.utilization_percent) {
    return 0;
  }
  return Math.min(usage.utilization_percent, 100);
}

export function includedTasksLabel(plan: SubscriptionPlan): string {
  if (plan.included_tasks_per_month == null) {
    return 'Unlimited';
  }
  return plan.included_tasks_per_month.toLocaleString();
}

export function overageRateLabel(plan: SubscriptionPlan): string {
  if (plan.overage_unit_price_etb == null) {
    return 'N/A';
  }
  return `${Number(plan.overage_unit_price_etb).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB / task`;
}

export function planPriceLabel(plan: SubscriptionPlan): string {
  if (plan.flat_price_etb == null) {
    return 'Contact sales';
  }
  if (Number(plan.flat_price_etb) === 0) {
    return 'Free';
  }
  const cycle = plan.billing_cycle === 'monthly' ? 'month' : plan.billing_cycle === 'quarterly' ? 'quarter' : null;
  const price = Number(plan.flat_price_etb).toLocaleString();
  return cycle ? `${price} ETB / ${cycle}` : `${price} ETB`;
}

export function overageCostLabel(usage: UsageSummary): string {
  if (usage.estimated_overage_cost_etb == null) {
    return 'N/A';
  }
  return `${Number(usage.estimated_overage_cost_etb).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;
}

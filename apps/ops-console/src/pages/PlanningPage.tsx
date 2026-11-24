import { useEffect, useState } from 'react';

import { Dialog } from '../components/ui/Dialog';
import { MetricTile } from '../components/ui/MetricTile';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  approveReplenishmentPlan,
  generateReplenishmentPlans,
  listReplenishmentPlans,
  rejectReplenishmentPlan,
} from '../services/logisticsApi';
import type { ReplenishmentPlan } from '../types/api';
import { apiErrorMessage } from '../services/authErrors';

function statusTone(status: ReplenishmentPlan['status']) {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  return 'warning';
}

/* ── Inline rejection reason dialog ────────────────────────── */

function RejectDialog({
  sku,
  busy,
  onConfirm,
  onCancel,
}: {
  sku: string;
  busy: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('Need manual review');

  return (
    <Dialog
      eyebrow="Plan rejection"
      title={`Reject plan for ${sku}`}
      description="Add a short reason so the planning team knows what to change."
      onClose={onCancel}
      actions={
        <>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="fp-action-secondary !min-h-8 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={busy || !reason.trim()}
            className="fp-action-danger !min-h-8 text-xs"
          >
            {busy ? 'Rejecting...' : 'Reject plan'}
          </button>
        </>
      }
    >
      <textarea
        autoFocus
        className="fp-input min-h-24 px-4 py-3"
        placeholder="Reason for rejection..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
    </Dialog>
  );
}

export function PlanningPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<ReplenishmentPlan[]>([]);
  const [horizon, setHorizon] = useState(4);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ plan: ReplenishmentPlan } | null>(null);

  const approvePlan = async (planId: string) => {
    setBusyPlanId(planId);
    try {
      await approveReplenishmentPlan(planId);
      await loadPlans();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to approve plan'));
    } finally {
      setBusyPlanId(null);
    }
  };

  async function loadPlans() {
    try {
      setError(null);
      const data = await listReplenishmentPlans();
      setPlans(data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load plans'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
  }, []);

  async function onGenerate() {
    try {
      setError(null);
      setIsGenerating(true);
      await generateReplenishmentPlans(horizon);
      await loadPlans();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to generate plans'));
    } finally {
      setIsGenerating(false);
    }
  }

  async function onRejectConfirm(reason: string) {
    if (!rejectDialog) return;
    setBusyPlanId(rejectDialog.plan.id);
    try {
      await rejectReplenishmentPlan(rejectDialog.plan.id, reason);
      await loadPlans();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to reject plan'));
    } finally {
      setBusyPlanId(null);
      setRejectDialog(null);
    }
  }

  const counts = {
    pending: plans.filter((plan) => plan.status === 'pending_approval').length,
    approved: plans.filter((plan) => plan.status === 'approved').length,
    rejected: plans.filter((plan) => plan.status === 'rejected').length,
  };

  return (
    <div className="space-y-4">
      {rejectDialog ? (
        <RejectDialog
          sku={rejectDialog.plan.sku}
          busy={busyPlanId === rejectDialog.plan.id}
          onConfirm={onRejectConfirm}
          onCancel={() => setRejectDialog(null)}
        />
      ) : null}

      <PageHeader
        eyebrow="Planning"
        title="Plan inventory replenishment"
        description="Review stock demand, suggested amounts, and plans waiting for approval."
      />

      <div className="grid overflow-hidden rounded-lg border border-[#e5e4e0] bg-white sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-[#efeeea]">
        <MetricTile title="Horizon" value={`${horizon} weeks`} detail="Next planning run" tone="info" />
        <MetricTile title="Pending" value={counts.pending} detail="Waiting for admin" tone={counts.pending > 0 ? 'warning' : 'success'} />
        <MetricTile title="Approved" value={counts.approved} detail="Accepted into operations" tone="success" />
        <MetricTile title="Rejected" value={counts.rejected} detail="Returned for review" tone="danger" />
      </div>

      <Panel
        eyebrow="Generate"
        title="Run replenishment planning"
        description="Create new stock suggestions using the time period and latest inventory and demand data."
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1.5 text-xs font-medium text-[#454540]" htmlFor="horizon">
            Horizon (weeks)
            <input
              id="horizon"
              type="number"
              min={1}
              max={12}
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="fp-input min-h-10 w-28"
            />
          </label>
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="glow-ring fp-action-primary"
          >
            {isGenerating ? (
              <svg className="animate-spin-slow h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="50 20" /></svg>
            ) : null}
            {isGenerating ? 'Generating...' : 'Generate replenishment suggestions'}
          </button>
        </div>
      </Panel>

      {error ? (
        <Panel className="border-[#e7c2be] bg-[#fff8f7]">
          <p role="alert" className="text-sm text-[#8f302a]">{error}</p>
        </Panel>
      ) : null}

      {loading ? (
        <Panel eyebrow="Approval board" title="Current replenishment plans">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-[120px]" />
            ))}
          </div>
        </Panel>
      ) : null}

      {!loading ? (
        <Panel
          eyebrow="Approval board"
          title="Current replenishment plans"
          description="Check the expected demand, suggested amount, and approval status before ordering stock."
        >
          <div className="space-y-6">
            {plans.filter((plan) => plan.status === 'pending_approval').length > 0 ? (
              <div className="space-y-3">
                {plans
                  .filter((plan) => plan.status === 'pending_approval')
                  .map((plan) => (
                    <PlanRow
                      key={plan.id}
                      plan={plan}
                      userRole={user?.role}
                      busy={busyPlanId === plan.id}
                      onApprove={approvePlan}
                      onReject={() => setRejectDialog({ plan })}
                    />
                  ))}
              </div>
            ) : null}

            {plans.filter((plan) => plan.status !== 'pending_approval').length > 0 ? (
              <div className="space-y-3 border-t border-[#e5e4e0] pt-4">
                {plans
                  .filter((plan) => plan.status !== 'pending_approval')
                  .map((plan) => (
                    <PlanRow
                      key={plan.id}
                      plan={plan}
                      userRole={user?.role}
                      busy={busyPlanId === plan.id}
                      onApprove={approvePlan}
                      onReject={() => setRejectDialog({ plan })}
                    />
                  ))}
              </div>
            ) : null}

            {plans.length === 0 ? (
              <div className="rounded-md bg-[#f7f7f5] p-6 text-center">
                <p className="text-sm font-semibold text-[#252522]">No plans yet</p>
                <p className="mt-1 text-xs text-[#5f5f59]">Generate replenishment suggestions using the form above.</p>
              </div>
            ) : null}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function PlanRow({
  plan,
  userRole,
  busy,
  onApprove,
  onReject,
}: {
  plan: ReplenishmentPlan;
  userRole: string | undefined;
  busy: boolean;
  onApprove: (planId: string) => void;
  onReject: () => void;
}) {
  return (
    <article className="fp-row">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={plan.status} tone={statusTone(plan.status)} />
            <span className="text-xs text-[#73736e]">{plan.warehouse_code}</span>
          </div>
          <h3 className="mt-1.5 text-sm font-semibold text-[#252522]">{plan.sku}</h3>
        </div>
        <div className="grid gap-1 text-right font-mono text-xs text-[#5f5f59] tabular-nums sm:grid-cols-3 sm:text-left">
          <span>Avg demand: <span className="font-semibold text-[#252522]">{plan.avg_weekly_demand.toFixed(2)}</span></span>
          <span>Suggested: <span className="font-semibold text-[#252522]">{plan.suggested_quantity}</span></span>
          <span>Horizon: <span className="font-semibold text-[#252522]">{plan.horizon_weeks}w</span></span>
        </div>
      </div>

      <p className="mt-1.5 text-xs leading-5 text-[#5f5f59]">{plan.rationale}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(userRole === 'admin' || userRole === 'owner') && plan.status === 'pending_approval' ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onApprove(plan.id)}
              className="fp-action-secondary !min-h-8 !text-[#14745f]"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onReject}
              className="fp-action-quiet !text-[#a3342f]"
            >
              Reject
            </button>
          </>
        ) : plan.status === 'rejected' ? (
          <span className="text-xs text-[#8f302a]">{plan.rejection_reason || 'No rejection reason recorded.'}</span>
        ) : plan.status === 'pending_approval' ? (
          <span className="text-xs text-[#73736e]">Waiting for admin approval.</span>
        ) : (
          <span className="text-xs text-[#14745f]">Approved</span>
        )}
      </div>
    </article>
  );
}

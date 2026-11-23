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
  onConfirm,
  onCancel,
}: {
  sku: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('Need manual review');

  return (
    <Dialog
      eyebrow="Plan rejection"
      title={`Reject plan for ${sku}`}
      description="Add a short reason so the planning team knows what to change."
      actions={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="glow-ring inline-flex min-h-8 items-center justify-center border border-[#cfd9d5] bg-white px-3 text-xs font-semibold text-[#40534c] transition hover:bg-[#eef3f0]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim()}
            className="glow-ring inline-flex min-h-8 items-center justify-center bg-[#b93a36] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#9f2f2b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reject plan
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
  const [rejectDialog, setRejectDialog] = useState<{ plan: ReplenishmentPlan } | null>(null);

  const approvePlan = async (planId: string) => {
    try {
      await approveReplenishmentPlan(planId);
      await loadPlans();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to approve plan'));
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
    try {
      await rejectReplenishmentPlan(rejectDialog.plan.id, reason);
      await loadPlans();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to reject plan'));
    } finally {
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
        <div className="flex flex-wrap items-center gap-3">
          <label className="grid gap-1.5 text-xs font-medium text-[#40534c]" htmlFor="horizon">
            Horizon (weeks)
            <input
              id="horizon"
              type="number"
              min={1}
              max={12}
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="fp-input w-28"
            />
          </label>
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="glow-ring inline-flex min-h-9 items-center justify-center gap-2 bg-[#087f72] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#06675d] disabled:opacity-60"
          >
            {isGenerating ? (
              <svg className="animate-spin-slow h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="50 20" /></svg>
            ) : null}
            {isGenerating ? 'Generating...' : 'Generate replenishment suggestions'}
          </button>
        </div>
      </Panel>

      {error ? (
        <Panel className="border-[#e7c2be] bg-[#fff8f7]">
          <p className="text-sm text-[#8f302a]">{error}</p>
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
                    <PlanRow key={plan.id} plan={plan} userRole={user?.role} onApprove={approvePlan} onReject={() => setRejectDialog({ plan })} />
                  ))}
              </div>
            ) : null}

            {plans.filter((plan) => plan.status !== 'pending_approval').length > 0 ? (
              <div className="space-y-3 border-t border-[#e6ebe8] pt-4 opacity-80">
                {plans
                  .filter((plan) => plan.status !== 'pending_approval')
                  .map((plan) => (
                    <PlanRow key={plan.id} plan={plan} userRole={user?.role} onApprove={approvePlan} onReject={() => setRejectDialog({ plan })} />
                  ))}
              </div>
            ) : null}

            {plans.length === 0 ? (
              <div className="border border-dashed border-[#c8d4cf] bg-[#f8faf9] p-6 text-center">
                <p className="text-sm font-semibold text-[#40534c]">No plans yet</p>
                <p className="mt-1 text-xs text-[#63766f]">Generate replenishment suggestions using the form above.</p>
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
  onApprove,
  onReject,
}: {
  plan: ReplenishmentPlan;
  userRole: string | undefined;
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
          <h3 className="mt-1.5 text-sm font-semibold text-[#20372f]">{plan.sku}</h3>
        </div>
        <div className="grid gap-1 text-right font-mono text-xs text-[#63766f] tabular-nums sm:grid-cols-3 sm:text-left">
          <span>Avg demand: <span className="font-semibold text-[#20372f]">{plan.avg_weekly_demand.toFixed(2)}</span></span>
          <span>Suggested: <span className="font-semibold text-[#20372f]">{plan.suggested_quantity}</span></span>
          <span>Horizon: <span className="font-semibold text-[#20372f]">{plan.horizon_weeks}w</span></span>
        </div>
      </div>

      <p className="mt-1.5 text-xs leading-5 text-[#63766f]">{plan.rationale}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(userRole === 'admin' || userRole === 'owner') && plan.status === 'pending_approval' ? (
          <>
            <button
              onClick={() => onApprove(plan.id)}
              className="fp-action-secondary !min-h-8 !text-[#14745f]"
            >
              Approve
            </button>
            <button
              onClick={onReject}
              className="fp-action-quiet !text-[#a3342f]"
            >
              Reject
            </button>
          </>
        ) : (
          <span className="text-xs text-[#63766f]">{plan.rejection_reason || 'No rejection reason recorded.'}</span>
        )}
      </div>
    </article>
  );
}

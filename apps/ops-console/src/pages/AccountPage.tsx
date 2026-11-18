import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { MetricTile } from '../components/ui/MetricTile';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TeamPanel } from '../components/TeamPanel';
import { WorkspaceResetDangerZone } from '../components/WorkspaceResetDangerZone';
import { useAuth } from '../context/AuthContext';
import {
  createProviderKey,
  getCurrentUsage,
  getCurrentSubscription,
  getProviderPreference,
  listPlans,
  listProviderKeys,
  revokeProviderKey,
  selectTier,
  setProviderPreference,
  testProviderKey,
  updateContactPhone,
} from '../services/billingApi';
import { getAuditTimeline } from '../services/logisticsApi';
import { includedTasksLabel, overageCostLabel, overageRateLabel, planPriceLabel, usageMetricLabel, usageProgressPercent } from './accountUsageUtils';
import type { AuditEvent, CurrentSubscription, ProviderKey, SubscriptionPlan, SubscriptionTier, UsageSummary } from '../types/api';

function keyTone(status: string) {
  if (status === 'active') return 'success';
  if (status === 'revoked') return 'danger';
  return 'neutral';
}

export function AccountPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [keys, setKeys] = useState<ProviderKey[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [providerName, setProviderName] = useState('openai');
  const [keyName, setKeyName] = useState('primary');
  const [apiKey, setApiKey] = useState('');
  const [preferredKeyId, setPreferredKeyId] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentTier = subscription?.tier;

  async function refresh() {
    const [plansData, subData, keysData, preference, auditData] = await Promise.all([
      listPlans(),
      getCurrentSubscription(),
      listProviderKeys(),
      getProviderPreference(),
      getAuditTimeline().catch(() => []),
    ]);

    setPlans(plansData);
    setSubscription(subData);
    setKeys(keysData);
    setPreferredKeyId(preference.key_id || '');
    setAuditEvents(auditData);

    try {
      const usageData = await getCurrentUsage();
      setUsage(usageData);
    } catch {
      setUsage(null);
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        await refresh();
      } catch {
        if (mounted) {
          setStatusMessage('Unable to load account settings.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setContactPhone(subscription?.contact_phone ?? '');
  }, [subscription]);

  async function onSelectTier(tier: SubscriptionTier) {
    setStatusMessage(null);
    try {
      const updated = await selectTier(tier);
      setSubscription(updated);
      setStatusMessage(`Subscription updated to ${updated.tier}.`);
    } catch {
      setStatusMessage('Failed to update subscription tier.');
    }
  }

  async function onAddKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);
    try {
      await createProviderKey({ provider_name: providerName, key_name: keyName, api_key: apiKey });
      setApiKey('');
      await refresh();
      setStatusMessage('Provider key added successfully.');
    } catch {
      setStatusMessage('Failed to add provider key.');
    }
  }

  async function onTestKey(keyId: string) {
    setStatusMessage(null);
    try {
      const result = await testProviderKey(keyId);
      setStatusMessage(result.message);
    } catch {
      setStatusMessage('Failed to test provider key.');
    }
  }

  async function onRevokeKey(keyId: string) {
    setStatusMessage(null);
    try {
      await revokeProviderKey(keyId);
      await refresh();
      setStatusMessage('Provider key revoked.');
    } catch {
      setStatusMessage('Failed to revoke provider key.');
    }
  }

  async function onSetPreferredKey() {
    if (!preferredKeyId) {
      setStatusMessage('Select an active key first.');
      return;
    }
    setStatusMessage(null);
    try {
      const updated = await setProviderPreference(preferredKeyId);
      setStatusMessage(`Preferred AI provider set to ${updated.provider_name}.`);
      await refresh();
    } catch {
      setStatusMessage('Failed to update preferred AI provider.');
    }
  }

  async function onRefreshUsage() {
    setStatusMessage(null);
    try {
      const usageData = await getCurrentUsage();
      setUsage(usageData);
    } catch {
      setStatusMessage('Failed to refresh usage data.');
    }
  }

  async function onSaveContactPhone() {
    setStatusMessage(null);
    try {
      const updated = await updateContactPhone(contactPhone);
      setSubscription(updated);
      setStatusMessage('Escalation contact phone saved.');
    } catch {
      setStatusMessage('Failed to save escalation contact phone.');
    }
  }

  const tierLabel = useMemo(() => {
    if (!subscription) return 'Unknown';
    return `${subscription.tier} (${subscription.status})`;
  }, [subscription]);

  const progressPercent = useMemo(() => usageProgressPercent(usage), [usage]);
  const metricLabel = useMemo(() => usageMetricLabel(usage), [usage]);
  const activeKeyCount = useMemo(() => keys.filter((key) => key.status === 'active').length, [keys]);

  const fieldClassName = 'fp-input min-h-12';

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-[120px] rounded-[var(--fp-radius-hero)]" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-[110px] rounded-[var(--fp-radius-panel)]" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="skeleton h-[360px] rounded-[var(--fp-radius-hero)]" />
          <div className="skeleton h-[360px] rounded-[var(--fp-radius-hero)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Workspace controls"
        title="Workspace controls"
        description="Manage the plan, usage, team access, and provider connections."
      />

      <div className="grid overflow-hidden border border-[#d7dfdc] bg-white sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile title="Current plan" value={subscription?.tier ?? 'Unknown'} detail={`Status: ${subscription?.status ?? 'unknown'}`} tone="info" />
        <MetricTile title="Usage" value={usage ? `${usage.used_units.toLocaleString()}` : 'N/A'} detail={metricLabel} tone={progressPercent >= 100 ? 'danger' : progressPercent >= 80 ? 'warning' : 'success'} />
        <MetricTile title="Preferred provider" value={subscription?.preferred_ai_provider ?? 'None'} detail="For dashboard workflows" tone="neutral" />
        <MetricTile title="Active keys" value={activeKeyCount} detail="Available provider credentials" tone={activeKeyCount > 0 ? 'success' : 'warning'} />
      </div>

      {statusMessage ? (
        <Panel className="border-[#bfd8e5] bg-[#f3f9fc]">
          <p className="text-sm text-[#17679b]">{statusMessage}</p>
        </Panel>
      ) : null}

      {/* Section 1 — plan + usage posture (dominant, full width) */}
      <Panel
        eyebrow="Subscription"
        title="Current plan and usage posture"
          description="Switch tiers, monitor included task capacity, and keep the commercial model legible to workspace operators."
          actions={
            <button
              type="button"
              onClick={onRefreshUsage}
              className="inline-flex min-h-8 items-center justify-center border border-[#cfd9d5] bg-white px-3 text-[11px] font-semibold text-[#40534c] transition-colors hover:bg-[#eef3f0]"
            >
              Refresh usage
            </button>
          }
        >
          <div className="border border-[#d7dfdc] bg-[#f8faf9] p-3">
            <p className="text-xs font-semibold text-[#20372f]">Current plan: {tierLabel}</p>
            <p className="mt-1 text-xs text-[#63766f]">Organization: {subscription?.organization_name ?? 'Unknown'}</p>
          </div>

          <div className="mt-3 border border-[#d7dfdc] bg-[#f8faf9] p-3">
            <p className="text-xs font-semibold text-[#20372f]">Usage meter</p>
            <p className="mt-0.5 text-[11px] text-[#63766f]">{metricLabel}</p>

            {usage ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-2 text-xs text-[#63766f] md:grid-cols-3">
                  <p>
                    Period: <span className="font-semibold text-[#40534c]">{usage.period_start}</span> to{' '}
                    <span className="font-semibold text-[#40534c]">{usage.period_end}</span>
                  </p>
                  <p>
                    Used: <span className="font-mono font-semibold tabular-nums text-[#40534c]">{usage.used_units.toLocaleString()}</span>
                  </p>
                  <p>
                    Included:{' '}
                    <span className="font-mono font-semibold tabular-nums text-[#40534c]">
                      {usage.included_units == null ? 'Unlimited' : usage.included_units.toLocaleString()}
                    </span>
                  </p>
                </div>

                {usage.included_units != null ? (
                  <>
                    <div className="h-1 overflow-hidden bg-[#dce8e3]">
                      <div className="h-full bg-[#087f72]" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <p className="text-xs text-[#63766f]">
                      Utilization: <span className="font-mono font-semibold tabular-nums text-[#40534c]">{usage.utilization_percent ?? 0}%</span>
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-[#63766f]">No monthly cap on this plan.</p>
                )}

                <div className="grid gap-2 text-xs text-[#63766f] md:grid-cols-2">
                  <p>
                    Overage units: <span className="font-mono font-semibold tabular-nums text-[#40534c]">{usage.overage_units.toLocaleString()}</span>
                  </p>
                  <p>
                    Estimated overage cost:{' '}
                    <span className="font-mono font-semibold tabular-nums text-[#40534c]">
                      {overageCostLabel(usage)}
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-[#63766f]">Usage endpoint unavailable. Run the latest backend migration and refresh.</p>
            )}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.tier} className="border border-[#d7dfdc] bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[#20372f]">{plan.title}</h2>
                    <p className="font-mono tabular-nums text-xs text-[#63766f]">{planPriceLabel(plan)}</p>
                  </div>
                  {currentTier === plan.tier ? <StatusBadge label="Current" tone="info" /> : null}
                </div>
                <div className="mt-2 space-y-0.5 text-[11px] text-[#63766f]">
                  <p>Seats: <span className="font-mono tabular-nums">{plan.seat_limit ?? 'Unlimited'}</span></p>
                  <p>Vehicles: <span className="font-mono tabular-nums">{plan.vehicle_limit ?? 'Unlimited'}</span></p>
                  <p>Included tasks: <span className="font-mono tabular-nums">{includedTasksLabel(plan)}</span></p>
                  <p>Overage rate: <span className="font-mono tabular-nums">{overageRateLabel(plan)}</span></p>
                </div>
                <button
                  type="button"
                  disabled={currentTier === plan.tier}
                  onClick={() => onSelectTier(plan.tier)}
                  className="mt-3 inline-flex min-h-8 w-full items-center justify-center border border-[#cfd9d5] bg-white px-3 text-[11px] font-semibold text-[#40534c] transition-colors hover:bg-[#eef3f0] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {currentTier === plan.tier ? 'Current plan' : 'Switch to plan'}
                </button>
              </div>
            ))}
          </div>
        </Panel>

        {/* Sections 2 + 3 — escalation contact and provider control as
            side-by-side secondary work areas */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel
          eyebrow="Escalation contact"
          title="Escalation SMS phone"
          description="Receipt escalations are sent to this number. The workspace can be locked exactly when escalation matters — owners and admins can update it anytime."
        >
          <div className="border border-[#d7dfdc] bg-[#f8faf9] p-3">
            <label htmlFor="contactPhone" className="text-xs font-semibold text-[#20372f]">
              Contact phone
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                id="contactPhone"
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                className={`${fieldClassName} min-w-0 flex-1 sm:min-w-[240px]`}
                placeholder="Escalation phone"
              />
              <button
                type="button"
                onClick={onSaveContactPhone}
                className="inline-flex min-h-9 items-center justify-center bg-[#087f72] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#06675d]"
              >
                Save phone number
              </button>
            </div>
            <p className="mt-2 text-[11px] text-[#63766f]">
              Current: {subscription?.contact_phone ?? 'Not set'}
            </p>
          </div>
        </Panel>

      <TeamPanel />

        <Panel
          eyebrow="AI provider control"
          title="Bring your own provider keys"
          description="Set the preferred provider for dashboard workflows, test active keys, and rotate credentials without leaving the workspace."
        >
          <div className="border border-[#d7dfdc] bg-[#f8faf9] p-3">
            <p className="text-xs font-semibold text-[#20372f]">Preferred AI provider for the dashboard</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <select value={preferredKeyId} onChange={(event) => setPreferredKeyId(event.target.value)} className={`${fieldClassName} min-w-0 flex-1 sm:min-w-[240px]`}>
                <option value="">Select active provider key</option>
                {keys
                  .filter((key) => key.status === 'active')
                  .map((key) => (
                    <option key={key.id} value={key.id}>{`${key.provider_name} - ${key.key_name} (${key.masked_key})`}</option>
                  ))}
              </select>
              <button
                type="button"
                onClick={onSetPreferredKey}
                className="inline-flex min-h-9 items-center justify-center bg-[#087f72] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#06675d]"
              >
                Save preferred provider
              </button>
            </div>
            <p className="mt-2 text-[11px] text-[#63766f]">Current: {subscription?.preferred_ai_provider ?? 'Not configured'}</p>
          </div>

          <form onSubmit={onAddKey} className="mt-4 grid gap-3 md:grid-cols-3">
            <input value={providerName} onChange={(event) => setProviderName(event.target.value)} className={fieldClassName} placeholder="Provider name" />
            <input value={keyName} onChange={(event) => setKeyName(event.target.value)} className={fieldClassName} placeholder="Key label" />
            <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} className={fieldClassName} placeholder="API key" />
            <div className="md:col-span-3">
              <button type="submit" className="inline-flex min-h-9 items-center justify-center bg-[#087f72] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#06675d]">
                Save key
              </button>
            </div>
          </form>

          <div className="mt-4 space-y-3">
            {keys.map((key) => (
              <article key={key.id} className="fp-row">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge label={key.status} tone={keyTone(key.status)} />
                      <span className="text-[10px] uppercase tracking-wide text-[#6b7d76]">{key.provider_name}</span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-semibold text-[#20372f]">{key.key_name}</h3>
                    <p className="mt-0.5 font-mono text-[10px] text-[#63766f]">{key.masked_key}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onTestKey(key.id)}
                      className="min-h-8 border border-[#cfd9d5] bg-white px-2.5 text-[11px] font-semibold text-[#40534c] transition hover:bg-[#eef3f0]"
                    >
                      Test
                    </button>
                    {key.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => onRevokeKey(key.id)}
                        className="min-h-8 border border-[#e7c2be] bg-white px-2.5 text-[11px] font-semibold text-[#a3342f] transition hover:bg-[#fcf0ef]"
                      >
                        Revoke
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}

            {keys.length === 0 ? <p className="text-xs text-[#63766f]">No provider keys configured yet.</p> : null}
          </div>
        </Panel>
      </div>

      <Panel
        eyebrow="Audit timeline"
        title="Recent workspace events"
        description="Subscription changes, provider-key actions, routing decisions, and planning events are recorded here for operator review."
      >
        <div className="space-y-3">
          {auditEvents.slice(0, 8).map((event) => (
            <article key={event.id} className="border-t border-[#e6ebe8] py-2.5 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={event.entity_type} tone="info" />
                    <span className="text-[10px] uppercase tracking-wide text-[#6b7d76]">{event.event_type}</span>
                  </div>
                  <h3 className="mt-1.5 text-xs font-semibold text-[#20372f]">{event.description}</h3>
                </div>
                <span className="text-[10px] text-[#63766f]">{new Date(event.created_at).toLocaleString()}</span>
              </div>
            </article>
          ))}

          {auditEvents.length === 0 ? <p className="text-xs text-[#63766f]">No audit events recorded yet.</p> : null}
        </div>
      </Panel>

      {user?.role === 'admin' ? (
        <WorkspaceResetDangerZone
          organizationName={subscription?.organization_name ?? ''}
          isAdmin
        />
      ) : null}
    </div>
  );
}


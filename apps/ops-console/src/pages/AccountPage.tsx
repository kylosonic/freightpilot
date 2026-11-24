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

type StatusBanner = {
  tone: 'info' | 'error';
  message: string;
};

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
  const [statusBanner, setStatusBanner] = useState<StatusBanner | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingTier, setSavingTier] = useState<SubscriptionTier | null>(null);
  const [savingProvider, setSavingProvider] = useState(false);
  const [addingKey, setAddingKey] = useState(false);
  const [busyKeyId, setBusyKeyId] = useState<string | null>(null);

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
          setStatusBanner({ tone: 'error', message: 'Unable to load account settings.' });
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
    setStatusBanner(null);
    setSavingTier(tier);
    try {
      const updated = await selectTier(tier);
      setSubscription(updated);
      setStatusBanner({ tone: 'info', message: `Subscription updated to ${updated.tier}.` });
    } catch {
      setStatusBanner({ tone: 'error', message: 'Could not change your plan.' });
    } finally {
      setSavingTier(null);
    }
  }

  async function onAddKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusBanner(null);
    setAddingKey(true);
    try {
      await createProviderKey({ provider_name: providerName, key_name: keyName, api_key: apiKey });
      setApiKey('');
      await refresh();
      setStatusBanner({ tone: 'info', message: 'Provider key added successfully.' });
    } catch {
      setStatusBanner({ tone: 'error', message: 'Could not add the API key.' });
    } finally {
      setAddingKey(false);
    }
  }

  async function onTestKey(keyId: string) {
    setStatusBanner(null);
    setBusyKeyId(keyId);
    try {
      const result = await testProviderKey(keyId);
      setStatusBanner({ tone: result.ok ? 'info' : 'error', message: result.message });
    } catch {
      setStatusBanner({ tone: 'error', message: 'Could not test the API key.' });
    } finally {
      setBusyKeyId(null);
    }
  }

  async function onRevokeKey(keyId: string) {
    setStatusBanner(null);
    setBusyKeyId(keyId);
    try {
      await revokeProviderKey(keyId);
      await refresh();
      setStatusBanner({ tone: 'info', message: 'Provider key revoked.' });
    } catch {
      setStatusBanner({ tone: 'error', message: 'Could not remove the API key.' });
    } finally {
      setBusyKeyId(null);
    }
  }

  async function onSetPreferredKey() {
    if (!preferredKeyId) {
      setStatusBanner({ tone: 'error', message: 'Select an active key first.' });
      return;
    }
    setStatusBanner(null);
    setSavingProvider(true);
    try {
      const updated = await setProviderPreference(preferredKeyId);
      setStatusBanner({ tone: 'info', message: `Preferred AI provider set to ${updated.provider_name}.` });
      await refresh();
    } catch {
      setStatusBanner({ tone: 'error', message: 'Could not change the AI provider.' });
    } finally {
      setSavingProvider(false);
    }
  }

  async function onRefreshUsage() {
    setStatusBanner(null);
    try {
      const usageData = await getCurrentUsage();
      setUsage(usageData);
    } catch {
      setStatusBanner({ tone: 'error', message: 'Could not load usage. Try again.' });
    }
  }

  async function onSaveContactPhone() {
    setStatusBanner(null);
    setSavingPhone(true);
    try {
      const updated = await updateContactPhone(contactPhone);
      setSubscription(updated);
      setStatusBanner({ tone: 'info', message: 'Support phone number saved.' });
    } catch {
      setStatusBanner({ tone: 'error', message: 'Could not save the support phone number.' });
    } finally {
      setSavingPhone(false);
    }
  }

  const tierLabel = useMemo(() => {
    if (!subscription) return 'Not loaded';
    return subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1);
  }, [subscription]);

  const progressPercent = useMemo(() => usageProgressPercent(usage), [usage]);
  const metricLabel = useMemo(() => usageMetricLabel(usage), [usage]);
  const activeKeyCount = useMemo(() => keys.filter((key) => key.status === 'active').length, [keys]);

  const fieldClassName = 'fp-input min-h-10';

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
        eyebrow="Settings"
        title="Workspace settings"
        description="Manage your plan, usage, team access, and connected services."
      />

      <div className="grid overflow-hidden rounded-lg border border-[#e5e4e0] bg-white sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-[#efeeea]">
        <MetricTile title="Plan" value={tierLabel} detail={subscription?.status ?? 'Not loaded'} tone="info" />
        <MetricTile title="Tasks used" value={usage ? usage.used_units.toLocaleString() : 'Not loaded'} detail={usage ? 'This month' : 'Try again later'} tone={progressPercent >= 100 ? 'danger' : progressPercent >= 80 ? 'warning' : 'success'} />
        <MetricTile title="AI provider" value={subscription?.preferred_ai_provider ?? 'None'} detail="Used for AI features" tone="neutral" />
        <MetricTile title="API keys" value={activeKeyCount} detail="Ready to use" tone={activeKeyCount > 0 ? 'success' : 'warning'} />
      </div>

      {statusBanner ? (
        <Panel
          className={
            statusBanner.tone === 'error'
              ? 'border-[#e7c2be] bg-[#fff8f7]'
              : 'border-[#bfd8e5] bg-[#f3f9fc]'
          }
        >
          <p
            role={statusBanner.tone === 'error' ? 'alert' : 'status'}
            className={statusBanner.tone === 'error' ? 'text-sm text-[#8f302a]' : 'text-sm text-[#17679b]'}
          >
            {statusBanner.message}
          </p>
        </Panel>
      ) : null}

      {/* Plan and usage take the full width because they affect what every teammate can use. */}
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

      {/* Sections 2 + 3 — escalation contact and provider control side by side */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel
          eyebrow="Support"
          title="Support phone number"
          description="We send payment or access problems to this number. Owners and admins can change it at any time."
        >
          <div>
            <label htmlFor="contactPhone" className="text-xs font-semibold text-[#454540]">
              Contact phone
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                id="contactPhone"
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                className={`${fieldClassName} min-w-0 flex-1 sm:min-w-[240px]`}
                placeholder="Phone number"
              />
              <button
                type="button"
                disabled={savingPhone}
                onClick={onSaveContactPhone}
                className="fp-action-primary"
              >
                {savingPhone ? 'Saving...' : 'Save phone'}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-[#73736e]">
              {subscription?.contact_phone ? `Current: ${subscription.contact_phone}` : 'No phone number set.'}
            </p>
          </div>
        </Panel>

        <Panel
          eyebrow="AI settings"
          title="AI provider keys"
          description="Choose which AI provider to use, test a key, and replace it when needed."
        >
          <div>
            <label htmlFor="preferredKeySelect" className="text-xs font-semibold text-[#454540]">
              Preferred AI provider
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <select
                id="preferredKeySelect"
                value={preferredKeyId}
                onChange={(event) => setPreferredKeyId(event.target.value)}
                className={`${fieldClassName} min-w-0 flex-1 sm:min-w-[240px]`}
              >
                <option value="">Select active provider key</option>
                {keys
                  .filter((key) => key.status === 'active')
                  .map((key) => (
                    <option key={key.id} value={key.id}>{`${key.provider_name} - ${key.key_name} (${key.masked_key})`}</option>
                  ))}
              </select>
              <button
                type="button"
                disabled={savingProvider}
                onClick={onSetPreferredKey}
                className="fp-action-primary"
              >
                {savingProvider ? 'Saving...' : 'Save provider'}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-[#73736e]">
              {subscription?.preferred_ai_provider ? `Using ${subscription.preferred_ai_provider}` : 'No AI provider selected.'}
            </p>
          </div>

          <form onSubmit={onAddKey} className="mt-4 grid gap-3 md:grid-cols-3">
            <input
              aria-label="Provider name"
              value={providerName}
              onChange={(event) => setProviderName(event.target.value)}
              className={fieldClassName}
              placeholder="Provider name"
            />
            <input
              aria-label="Key label"
              value={keyName}
              onChange={(event) => setKeyName(event.target.value)}
              className={fieldClassName}
              placeholder="Key label"
            />
            <input
              aria-label="API key"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              className={fieldClassName}
              placeholder="API key"
              type="password"
              autoComplete="new-password"
            />
            <div className="md:col-span-3">
              <button type="submit" disabled={addingKey} className="fp-action-primary">
                {addingKey ? 'Saving...' : 'Save key'}
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
                      <span className="text-xs text-[#73736e]">{key.provider_name}</span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-semibold text-[#252522]">{key.key_name}</h3>
                    <p className="mt-0.5 text-[11px] text-[#73736e]">{key.status === 'active' ? 'Key is ready to use.' : 'This key no longer works.'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyKeyId === key.id}
                      onClick={() => onTestKey(key.id)}
                      className="fp-action-quiet !min-h-8"
                    >
                      {busyKeyId === key.id ? 'Checking...' : 'Check key'}
                    </button>
                    {key.status === 'active' ? (
                      <button
                        type="button"
                        disabled={busyKeyId === key.id}
                        onClick={() => onRevokeKey(key.id)}
                        className="fp-action-quiet !min-h-8 !text-[#a3342f]"
                      >
                        Revoke
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}

            {keys.length === 0 ? <p className="text-xs text-[#73736e]">No API keys yet.</p> : null}
          </div>
        </Panel>
      </div>

      <TeamPanel />

      <Panel
        eyebrow="History"
        title="Workspace activity"
        description="See recent changes to your plan, settings, routes, and stock plans."
      >
        <div className="space-y-3">
          {auditEvents.slice(0, 8).map((event) => (
            <article key={event.id} className="border-t border-[#efeeea] py-2.5 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-[#252522]">{event.description}</h3>
                  <p className="mt-0.5 text-[11px] text-[#73736e]">{event.entity_type} · {event.event_type.replace(/_/g, ' ')}</p>
                </div>
                <span className="text-[11px] text-[#73736e]">{new Date(event.created_at).toLocaleString()}</span>
              </div>
            </article>
          ))}

          {auditEvents.length === 0 ? <p className="text-xs text-[#73736e]">No recent changes.</p> : null}
        </div>
      </Panel>

      {user?.role === 'admin' || user?.role === 'owner' ? (
        <WorkspaceResetDangerZone
          organizationName={subscription?.organization_name ?? ''}
          isAdmin
        />
      ) : null}
    </div>
  );
}

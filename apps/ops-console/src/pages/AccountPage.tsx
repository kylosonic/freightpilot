import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { PlanComparisonSection } from '../components/account/PlanComparisonSection';
import { ProviderKeysCard } from '../components/account/ProviderKeysCard';
import { TeamPanel } from '../components/TeamPanel';
import { WorkspaceResetDangerZone } from '../components/WorkspaceResetDangerZone';
import { MetricTile } from '../components/ui/MetricTile';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { useAuth } from '../context/AuthContext';
import {
  createProviderKey,
  getCurrentSubscription,
  getCurrentUsage,
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
import type { AuditEvent, CurrentSubscription, ProviderKey, SubscriptionPlan, SubscriptionTier, UsageSummary } from '../types/api';
import { usageMetricLabel, usageProgressPercent } from './accountUsageUtils';

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

      <PlanComparisonSection
        tierLabel={tierLabel}
        subscription={subscription}
        usage={usage}
        metricLabel={metricLabel}
        progressPercent={progressPercent}
        plans={plans}
        currentTier={currentTier}
        savingTier={savingTier}
        onRefreshUsage={() => void onRefreshUsage()}
        onSelectTier={(tier) => void onSelectTier(tier)}
      />

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
                onClick={() => void onSaveContactPhone()}
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

        <ProviderKeysCard
          preferredAiProvider={subscription?.preferred_ai_provider}
          preferredKeyId={preferredKeyId}
          onPreferredKeyIdChange={setPreferredKeyId}
          onSetPreferredKey={() => void onSetPreferredKey()}
          savingProvider={savingProvider}
          providerName={providerName}
          onProviderNameChange={setProviderName}
          keyName={keyName}
          onKeyNameChange={setKeyName}
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
          onAddKey={onAddKey}
          addingKey={addingKey}
          keys={keys}
          busyKeyId={busyKeyId}
          onTestKey={(keyId) => void onTestKey(keyId)}
          onRevokeKey={(keyId) => void onRevokeKey(keyId)}
          fieldClassName={fieldClassName}
        />
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

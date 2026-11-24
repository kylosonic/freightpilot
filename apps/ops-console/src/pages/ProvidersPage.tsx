import { useEffect, useState } from 'react';

import { Dialog } from '../components/ui/Dialog';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { StatusBadge } from '../components/ui/StatusBadge';
import {
  listProviderKeys,
  createProviderKey,
  testProviderKey,
  revokeProviderKey,
} from '../services/logisticsApi';
import type { ProviderKey } from '../types/api';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../services/authErrors';

export function ProvidersPage() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ProviderKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [providerName, setProviderName] = useState('');
  const [keyName, setKeyName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ProviderKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    try {
      setIsLoading(true);
      const data = await listProviderKeys();
      setKeys(data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to fetch provider keys.'));
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTestError(null);
    setActionError(null);
    setIsSubmitting(true);

    try {
      // 1. Create the key
      const newKey = await createProviderKey({
        provider_name: providerName,
        key_name: keyName,
        api_key: apiKey,
      });

      // 2. Validate the key immediately
      const testResult = await testProviderKey(newKey.id);

      if (!testResult.ok) {
        setTestError(`Validation failed for ${providerName}: ${testResult.message}`);
      }

      // 3. Clear form and refresh list
      setProviderName('');
      setKeyName('');
      setApiKey('');
      await fetchKeys();
    } catch (err) {
      setTestError(apiErrorMessage(err, 'Failed to create provider key.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    setActionError(null);
    setRevoking(true);
    try {
      await revokeProviderKey(revokeTarget.id);
      setRevokeTarget(null);
      await fetchKeys();
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Failed to revoke key.'));
    } finally {
      setRevoking(false);
    }
  }

  const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Integrations"
        title="Connected services"
        description="Connect the services your team uses and manage their access keys."
      />

      {actionError ? (
        <Panel className="border-[#e7c2be] bg-[#fff8f7]">
          <p role="alert" className="text-sm text-[#8f302a]">{actionError}</p>
        </Panel>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel eyebrow="Connected" title="Service keys" description="Keys set up for your workspace.">
            {isLoading ? (
              <div role="status" className="py-8 text-center text-xs text-[#73736e]">Loading keys...</div>
            ) : error ? (
              <div role="alert" className="rounded-md border border-[#e7c2be] bg-[#fff8f7] p-3 text-sm text-[#8f302a]">
                {error}
              </div>
            ) : keys.length === 0 ? (
              <div className="rounded-md bg-[#f7f7f5] py-8 text-center text-xs text-[#5f5f59]">
                No service keys yet. Add one to connect a service.
              </div>
            ) : (
              <ul className="mt-4 grid gap-3">
                {keys.map((key) => (
                  <li
                    key={key.id}
                    className="fp-row flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h3 className="text-xs font-semibold text-[#252522]">{key.provider_name}</h3>
                        <span className="text-xs text-[#5f5f59]">{key.key_name}</span>
                        <StatusBadge
                          label={key.status}
                          tone={key.status === 'active' ? 'success' : 'danger'}
                        />
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-[#73736e]">{key.masked_key}</p>
                    </div>

                    {isAdminOrOwner && key.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => setRevokeTarget(key)}
                        className="fp-action-quiet !min-h-8 text-xs !text-[#a3342f]"
                      >
                        Revoke
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {isAdminOrOwner && (
          <div className="lg:col-span-1">
            <Panel eyebrow="New connection" title="Add a service key">
              <form onSubmit={onSubmit} className="mt-2 grid gap-4">
                <label className="grid gap-1.5 text-xs font-medium text-[#454540]">
                  Service name
                  <input
                    required
                    className="fp-input min-h-10"
                    placeholder="e.g. openai, groq"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                  />
                </label>

                <label className="grid gap-1.5 text-xs font-medium text-[#454540]">
                  Key label
                  <input
                    required
                    className="fp-input min-h-10"
                    placeholder="e.g. Primary workspace key"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                  />
                </label>

                <label className="grid gap-1.5 text-xs font-medium text-[#454540]">
                  API key or secret
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    className="fp-input min-h-10"
                    placeholder="••••••••••••••••"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </label>

                {testError ? (
                  <p role="alert" className="rounded-md border border-[#e7c2be] bg-[#fff8f7] p-3 text-xs text-[#8f302a]">
                    {testError}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="glow-ring fp-action-primary w-full"
                >
                  {isSubmitting ? 'Testing connection...' : 'Save and test key'}
                </button>
              </form>
            </Panel>
          </div>
        )}
      </div>

      {revokeTarget ? (
        <Dialog
          eyebrow="Revoke service key"
          title={`Revoke ${revokeTarget.key_name}?`}
          description="Services using this key will stop working immediately. This action cannot be undone."
          onClose={() => setRevokeTarget(null)}
          actions={
            <>
              <button type="button" disabled={revoking} onClick={() => setRevokeTarget(null)} className="fp-action-secondary !min-h-8 text-xs">
                Cancel
              </button>
              <button type="button" disabled={revoking} onClick={() => void confirmRevoke()} className="fp-action-danger !min-h-8 text-xs">
                {revoking ? 'Revoking...' : 'Revoke key'}
              </button>
            </>
          }
        />
      ) : null}
    </div>
  );
}

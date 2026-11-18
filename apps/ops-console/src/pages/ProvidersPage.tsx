import { useEffect, useState } from 'react';
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

  const [providerName, setProviderName] = useState('');
  const [keyName, setKeyName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

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

  async function onRevoke(keyId: string) {
    if (!window.confirm('Are you sure you want to revoke this key?')) return;
    try {
      await revokeProviderKey(keyId);
      await fetchKeys();
    } catch (err) {
      alert(apiErrorMessage(err, 'Failed to revoke key.'));
    }
  }

  const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';

  return (
    <div className="space-y-4">
      <PageHeader
        title="Carrier Integrations"
        description="Manage secure API credentials for third-party logistics providers and external routing engines."
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel eyebrow="Active Connections" title="Provider Keys" description="Keys configured for your workspace.">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-[#63766f]">Loading keys...</div>
            ) : error ? (
              <div className="border border-[#e7c2be] bg-[#fff8f7] p-3 text-sm text-[#8f302a]">
                {error}
              </div>
            ) : keys.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#63766f]">
                No provider keys configured. Add one to get started.
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
                        <h4 className="text-xs font-semibold text-[#20372f]">{key.provider_name}</h4>
                        <span className="text-xs text-[#63766f]">{key.key_name}</span>
                        <StatusBadge
                          label={key.status}
                          tone={key.status === 'active' ? 'success' : 'neutral'}
                        />
                      </div>
                      <p className="mt-1 font-mono text-[10px] text-[#6b7d76]">{key.masked_key}</p>
                    </div>

                    {isAdminOrOwner && key.status === 'active' && (
                      <button
                        onClick={() => onRevoke(key.id)}
                        className="min-h-8 border border-[#e7c2be] bg-white px-2.5 text-[11px] font-semibold text-[#a3342f] transition hover:bg-[#fcf0ef]"
                      >
                        REVOKE
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {isAdminOrOwner && (
          <div className="lg:col-span-1">
            <Panel eyebrow="New Integration" title="Add Credentials">
              <form onSubmit={onSubmit} className="mt-2 grid gap-4">
                <label className="grid gap-1.5 text-xs font-medium text-[#40534c]">
                  Provider Code
                  <input
                    required
                    className="fp-input"
                    placeholder="e.g. fourkites, project44"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                  />
                </label>

                <label className="grid gap-1.5 text-xs font-medium text-[#40534c]">
                  Key Name / Alias
                  <input
                    required
                    className="fp-input"
                    placeholder="e.g. Prod Logistics Token"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                  />
                </label>

                <label className="grid gap-1.5 text-xs font-medium text-[#40534c]">
                  API Key / Secret
                  <input
                    required
                    type="password"
                    className="fp-input"
                    placeholder="••••••••••••••••"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </label>

                {testError && (
                  <div className="mt-2 border border-[#e7c2be] bg-[#fff8f7] p-3 text-xs text-[#8f302a]" style={{ animation: 'fadeIn 0.3s ease-out both' }}>
                    {testError}
                  </div>
                )}

                <button
                  disabled={isSubmitting}
                  className="glow-ring mt-2 inline-flex min-h-9 items-center justify-center gap-2 bg-[#087f72] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#06675d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Validating connection...' : 'Securely Save Key'}
                </button>
              </form>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

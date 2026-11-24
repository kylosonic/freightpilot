import type { FormEvent } from 'react';

import type { ProviderKey } from '../../types/api';
import { Panel } from '../ui/Panel';
import { StatusBadge } from '../ui/StatusBadge';

function keyTone(status: string) {
  if (status === 'active') return 'success';
  if (status === 'revoked') return 'danger';
  return 'neutral';
}

type ProviderKeysCardProps = {
  preferredAiProvider: string | null | undefined;
  preferredKeyId: string;
  onPreferredKeyIdChange: (value: string) => void;
  onSetPreferredKey: () => void;
  savingProvider: boolean;
  providerName: string;
  onProviderNameChange: (value: string) => void;
  keyName: string;
  onKeyNameChange: (value: string) => void;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  onAddKey: (event: FormEvent<HTMLFormElement>) => void;
  addingKey: boolean;
  keys: ProviderKey[];
  busyKeyId: string | null;
  onTestKey: (keyId: string) => void;
  onRevokeKey: (keyId: string) => void;
  fieldClassName: string;
};

export function ProviderKeysCard({
  preferredAiProvider,
  preferredKeyId,
  onPreferredKeyIdChange,
  onSetPreferredKey,
  savingProvider,
  providerName,
  onProviderNameChange,
  keyName,
  onKeyNameChange,
  apiKey,
  onApiKeyChange,
  onAddKey,
  addingKey,
  keys,
  busyKeyId,
  onTestKey,
  onRevokeKey,
  fieldClassName,
}: ProviderKeysCardProps) {
  return (
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
            onChange={(event) => onPreferredKeyIdChange(event.target.value)}
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
          {preferredAiProvider ? `Using ${preferredAiProvider}` : 'No AI provider selected.'}
        </p>
      </div>

      <form onSubmit={onAddKey} className="mt-4 grid gap-3 md:grid-cols-3">
        <input
          aria-label="Provider name"
          value={providerName}
          onChange={(event) => onProviderNameChange(event.target.value)}
          className={fieldClassName}
          placeholder="Provider name"
        />
        <input
          aria-label="Key label"
          value={keyName}
          onChange={(event) => onKeyNameChange(event.target.value)}
          className={fieldClassName}
          placeholder="Key label"
        />
        <input
          aria-label="API key"
          value={apiKey}
          onChange={(event) => onApiKeyChange(event.target.value)}
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
  );
}

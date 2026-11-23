import { useState } from 'react';

import { apiErrorMessage } from '../services/authErrors';
import { setStoredToken } from '../services/api';
import { acceptInvitation } from '../services/teamApi';

const FIELD = 'fp-input mt-1 min-h-10';

export function AcceptInvitePage() {
  const fragment = typeof window === 'undefined' ? '' : window.location.hash.replace(/^#/, '');
  const token = new URLSearchParams(fragment).get('token') || '';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await acceptInvitation({
        token,
        username,
        password,
        full_name: fullName || undefined,
      });
      setStoredToken(result.access_token);
      window.history.replaceState(null, '', '/');
      window.location.replace('/');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not accept the invitation.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6f5] px-4 py-10 text-[#202b36]">
      <section className="w-full max-w-lg border border-[#d7dfdc] bg-white p-6 sm:p-8">
        <span className="grid h-9 w-9 place-items-center bg-[#153f3a] text-xs font-bold text-white">FP</span>
        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#087f72]">FreightPilot workspace</p>
        <h1 className="mt-1.5 text-2xl font-semibold text-[#172a24]">Accept your invitation</h1>
        <p className="mt-2 text-xs leading-5 text-[#63766f]">
          Create the account that will join the workspace. If the email already has an account,
          enter that account's existing password.
        </p>

        {!token ? (
          <p className="mt-5 border border-[#e7c2be] bg-[#fff8f7] p-3 text-sm text-[#8f302a]">
            This invitation link is missing a token.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-xs font-medium text-[#40534c]">
              Username
              <input
                className={FIELD}
                required
                minLength={3}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
              />
            </label>
            <label className="block text-xs font-medium text-[#40534c]">
              Full name <span className="font-normal text-[#63766f]">(optional)</span>
              <input
                className={FIELD}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="block text-xs font-medium text-[#40534c]">
              Password
              <input
                className={FIELD}
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
            </label>
            {error ? <p role="alert" className="text-sm text-[#8f302a]">{error}</p> : null}
            <button
              className="min-h-10 w-full bg-[#087f72] px-4 text-sm font-semibold text-white hover:bg-[#06675d] disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? 'Joining workspace…' : 'Join workspace'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

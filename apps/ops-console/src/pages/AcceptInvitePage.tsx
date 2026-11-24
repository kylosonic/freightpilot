import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { apiErrorMessage } from '../services/authErrors';
import { setStoredToken } from '../services/api';
import { acceptInvitation } from '../services/teamApi';

const FIELD = 'fp-input mt-1 min-h-10';

export function AcceptInvitePage() {
  const [token] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') || '';
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}`,
    );
  }, []);

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
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-4 py-10 text-[#252522]">
      <section className="w-full max-w-lg rounded-lg border border-[#e5e4e0] bg-white p-6 sm:p-8">
        <div className="inline-flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-[#2e4f47] text-[12px] font-semibold text-white">FP</span>
          <span className="text-[15px] font-semibold text-[#252522]">FreightPilot</span>
        </div>
        <p className="mt-5 text-[12px] font-medium text-[#73736e]">FreightPilot workspace</p>
        <h1 className="mt-1.5 text-2xl font-semibold text-[#252522]">Accept your invitation</h1>
        <p className="mt-2 text-xs leading-5 text-[#5f5f59]">
          Create the account that will join the workspace. If the email already has an account,
          enter that account&apos;s existing password.
        </p>

        {!token ? (
          <div className="mt-5 space-y-4">
            <p role="alert" className="rounded-md border border-[#e7c2be] bg-[#fff8f7] p-3 text-sm text-[#8f302a]">
              This invitation link is missing a token.
            </p>
            <Link to="/login" className="fp-action-secondary w-full min-h-10">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-[13px] font-medium text-[#454540]">
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
            <label className="block text-[13px] font-medium text-[#454540]">
              Full name <span className="font-normal text-[#73736e]">(optional)</span>
              <input
                className={FIELD}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="block text-[13px] font-medium text-[#454540]">
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
            {error ? (
              <p role="alert" className="rounded-md border border-[#e7c2be] bg-[#fff8f7] px-3.5 py-2.5 text-sm text-[#8f302a]">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              className="fp-action-primary min-h-10 w-full"
              disabled={submitting}
            >
              {submitting ? 'Joining workspace...' : 'Join workspace'}
            </button>
          </form>
        )}

        <div className="mt-6 border-t border-[#e5e4e0] pt-4 text-center">
          <Link to="/login" className="text-xs font-medium text-[#176b5c] underline-offset-4 hover:underline">
            Already in the workspace? Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}

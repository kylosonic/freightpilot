import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Navigate } from 'react-router-dom';

import { LoginFeedbackPanels } from '../components/login/LoginFeedbackPanels';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../services/authErrors';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const signupUrl =
    import.meta.env.VITE_SIGNUP_URL || 'https://freightpilot.pages.dev/launch/';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Production static hosting can retain the login chunk from an earlier
  // deploy for a few minutes. Reloading avoids waiting on that stale bundle.
  useEffect(() => {
    const reloadMarker = 'freightpilot_chunk_reload_at';

    function reloadOnce() {
      const lastReload = Number(sessionStorage.getItem(reloadMarker) || 0);
      if (Date.now() - lastReload < 60_000) return;
      sessionStorage.setItem(reloadMarker, String(Date.now()));
      window.location.reload();
    }

    function onChunkError(event: ErrorEvent) {
      const message = String(event.error?.message ?? event.message ?? '');
      if (/dynamically imported module|Importing a module script failed|Loading chunk/i.test(message)) {
        reloadOnce();
      }
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason as { name?: string; message?: string } | undefined;
      if (reason?.name === 'ChunkLoadError' || /dynamically imported module|Importing a module script failed|Loading chunk/i.test(reason?.message ?? '')) {
        reloadOnce();
      }
    }

    window.addEventListener('error', onChunkError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onChunkError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSignInError(null);
    setIsSubmitting(true);
    try {
      await login(identifier, password);
    } catch (err: unknown) {
      setSignInError(apiErrorMessage(err, 'Sign-in failed. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.72fr)]">
      <section className="hidden min-h-screen flex-col bg-[#f7f7f5] px-10 py-8 lg:flex xl:px-16 xl:py-12">
        <a href="https://freightpilot.pages.dev/" className="inline-flex w-fit items-center gap-2.5 rounded-md no-underline">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-[#2e4f47] text-[12px] font-semibold text-white">FP</span>
          <span className="text-[15px] font-semibold text-[#252522]">FreightPilot</span>
        </a>
        <div className="my-auto max-w-[650px] pb-16 pt-16">
          <p className="text-sm text-[#5f5f59]">FreightPilot</p>
          <h1 className="mt-3 text-[clamp(2.8rem,4.5vw,4.4rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-[#252522]">
            Your delivery day, in one place.
          </h1>
          <p className="mt-5 max-w-[520px] text-[17px] leading-8 text-[#5f5f59]">
            Plan routes, follow deliveries, fix problems, and check payments.
          </p>
          <div className="mt-12 max-w-[540px] divide-y divide-[#e5e4e0] border-y border-[#e5e4e0]">
            {[
              ['See what needs attention', 'Open the overview to see late deliveries and open issues.'],
              ['Get work moving', 'Go straight to the next shipment, route, or approval.'],
              ['Keep a clear record', 'Payment checks and past changes stay in one place.'],
            ].map(([title, detail], index) => (
              <div key={title} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3 py-4">
                <span className="text-[12px] text-[#5f5f59]">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <p className="text-sm font-medium text-[#252522]">{title}</p>
                  <p className="mt-0.5 text-sm leading-6 text-[#5f5f59]">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-[#5f5f59]">Less searching. More getting done.</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:border-l lg:border-[#e5e4e0] lg:px-12">
        <div className="w-full max-w-[400px]">
          <a href="https://freightpilot.pages.dev/" className="mb-14 inline-flex items-center gap-2 rounded-md no-underline lg:hidden">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-[#2e4f47] text-[11px] font-semibold text-white">FP</span>
            <span className="text-sm font-semibold text-[#252522]">FreightPilot</span>
          </a>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-[#252522]">Sign in</h2>
          <p className="mt-2 text-sm leading-6 text-[#73736e]">
            Welcome back. Use your company account to continue.
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="identifier" className="block text-[13px] font-medium text-[#454540]">
                Email or username
              </label>
              <input
                id="identifier"
                className="fp-input"
                placeholder="you@company.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[13px] font-medium text-[#454540]">
                Password
              </label>
              <input
                id="password"
                className="fp-input"
                placeholder="Enter your password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="glow-ring fp-action-primary min-h-11 w-full"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
              {!isSubmitting ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
            </button>
          </form>

          <LoginFeedbackPanels signInError={signInError} />

          <div className="mt-8 border-t border-[#e5e4e0] pt-5">
            <p className="text-[13px] text-[#73736e]">No workspace yet?</p>
            <a
              href={signupUrl}
              className="mt-1 inline-flex items-center gap-1 rounded-sm text-[13px] font-medium text-[#176b5c] underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Create company account
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

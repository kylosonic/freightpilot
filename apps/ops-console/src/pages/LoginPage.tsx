import { useState } from 'react';
import { ArrowRight, Boxes, CircleAlert, ShieldCheck } from 'lucide-react';
import { Navigate } from 'react-router-dom';

import { LoginFeedbackPanels } from '../components/login/LoginFeedbackPanels';
import { useAuth } from '../context/AuthContext';

function getErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: { detail?: string } } }).response;
    if (response?.data?.detail) {
      return response.data.detail;
    }
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

const VALUE_POINTS = [
  {
    label: 'Routes',
    title: 'Model dispatch decisions before they cost money.',
  },
  {
    label: 'Exceptions',
    title: 'Keep operational risks visible and actionable.',
  },
  {
    label: 'Workspace',
    title: 'Control billing, AI providers, and launch readiness in one place.',
  },
];

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const signupUrl =
    import.meta.env.VITE_SIGNUP_URL || 'https://freightpilot.pages.dev/launch/';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setSignInError(getErrorMessage(err, 'Login failed'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-[#f4f6f5] xl:grid-cols-[minmax(0,1.05fr)_minmax(400px,0.95fr)]">
      <section className="flex min-h-[270px] flex-col justify-between overflow-hidden bg-[#153f3a] px-6 py-8 text-white sm:px-10 lg:px-14 lg:py-12">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center bg-white text-[13px] font-bold text-[#153f3a]">FP</span>
          <div>
            <p className="text-base font-semibold">FreightPilot</p>
            <p className="text-xs text-[#c2d7d1]">Freight operations workspace</p>
          </div>
        </div>
        <div className="mt-10 max-w-[600px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a9cfc5]">Operations workspace</p>
          <h1 className="mt-2 text-[clamp(1.8rem,3vw,2.7rem)] font-semibold leading-tight">
            Enter the control tower with the same calm surface you saw on the site.
          </h1>
          <p className="mt-3 max-w-[520px] text-sm leading-6 text-[#c2d7d1]">
            Sign in with the company account you created during launch. Once inside, your routes,
            exceptions, onboarding progress, and provider controls all live in one operator surface.
          </p>
        </div>
        <div className="mt-10 hidden grid-cols-3 divide-x divide-[#3c625c] border-t border-[#3c625c] pt-5 xl:grid">
          {VALUE_POINTS.map((point, index) => {
            const Icon = [Boxes, CircleAlert, ShieldCheck][index];
            return (
              <div key={point.label} className={index === 0 ? 'pr-4' : 'px-4'}>
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#c2d7d1]">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {point.label}
                </div>
                <p className="mt-2 text-xs leading-5 text-white">{point.title}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
        <div className="w-full max-w-[430px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#087f72]">Control tower login</p>
          <h2 className="mt-1.5 text-2xl font-semibold text-[#172a24]">Sign in to your workspace</h2>
          <p className="mt-1.5 text-sm leading-6 text-[#5b6d66]">
            Use the company email and password you used when you created the workspace.
          </p>

          <form className="mt-7 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="identifier" className="block text-xs font-semibold text-[#40534c]">
                Company email or username
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
              <label htmlFor="password" className="block text-xs font-semibold text-[#40534c]">
                Password
              </label>
              <input
                id="password"
                className="fp-input"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button
              disabled={isSubmitting}
              className="glow-ring inline-flex min-h-11 w-full items-center justify-center gap-2 bg-[#087f72] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#06675d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in...' : 'Enter control tower'}
              {!isSubmitting ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
            </button>
          </form>

          <LoginFeedbackPanels signInError={signInError} />

          <div className="mt-6 border-t border-[#d7dfdc] pt-4">
            <p className="text-xs text-[#63766f]">New workspace? Create the company account on the product site first.</p>
            <a
              href={signupUrl}
              className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#087f72] underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Create company account
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

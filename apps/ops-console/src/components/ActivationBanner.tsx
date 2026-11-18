import { Link } from 'react-router-dom';

import { useActivationState, useDismissPitch } from '../hooks/queries';

// Free-cap + upgrade-pitch banners — ONE shared rendering,
// mounted in the Layout slot on EVERY console page. The activation/demo
// banner (ActivationBanner) is page-level on /dashboard + /upload only
//. Stack priority is server-derived (decision #6): p100 > p80 > p60.

const P100_MESSAGE =
  'Free tier cap reached. Writes resume next month, or upgrade now to continue immediately.';

export function CapPitchBanner() {
  const activationQ = useActivationState();
  const dismiss = useDismissPitch();

  const state = activationQ.data;
  if (!state) return null;

  const locked = state.free_cap?.locked ?? false;
  const level = locked ? 'p100' : state.pitch?.banner ?? null;
  if (!level) return null;

  if (level === 'p100') {
    return (
      <div
        role="banner"
        data-testid="cap-pitch-banner"
        className="mb-2 flex flex-wrap items-center justify-between gap-3 border border-[#e7c2be] border-l-4 border-l-[#b93a36] bg-[#fff8f7] px-4 py-2.5"
      >
        <p className="text-sm font-semibold leading-6 text-[#7d2924]">
          {state.free_cap?.message ?? P100_MESSAGE}
        </p>
        <Link
          to="/account"
          className="glow-ring inline-flex min-h-8 items-center justify-center bg-[#b93a36] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#9f2f2b]"
        >
          Upgrade now
        </Link>
      </div>
    );
  }

  if (level === 'p80') {
    return (
      <div
        role="banner"
        data-testid="cap-pitch-banner"
        className="mb-2 flex flex-wrap items-center justify-between gap-3 border border-[#e7d1a8] border-l-4 border-l-[#a15b00] bg-[#fffaf0] px-4 py-2.5"
      >
        <p className="text-sm font-semibold leading-6 text-[#704500]">
          You&apos;ve used 80% of your Free tier tasks. Consider upgrading before writes lock.
        </p>
        <Link
          to="/account"
          className="glow-ring inline-flex min-h-8 items-center justify-center border border-[#c89743] bg-white px-3 text-xs font-semibold text-[#704500] transition hover:bg-[#fcf3df]"
        >
          See pricing
        </Link>
      </div>
    );
  }

  return (
    <div
      role="banner"
      data-testid="cap-pitch-banner"
      className="mb-2 flex flex-wrap items-center justify-between gap-3 border border-[#d7dfdc] border-l-4 border-l-[#087f72] bg-white px-4 py-2.5"
    >
      <p className="text-sm font-medium leading-6 text-[#40534c]">
        You&apos;ve used 60% of your Free tier tasks this month.
      </p>
      <button
        type="button"
        onClick={() => dismiss.mutate('p60')}
        className="border border-[#cfd9d5] bg-white px-3 py-1 text-xs font-semibold text-[#52665e] transition hover:bg-[#eef3f0]"
      >
        Dismiss
      </button>
    </div>
  );
}

// Activation / demo banner (decision #8 + NB-34 copy matrix).
// mode="compact": /dashboard. mode="checklist": /upload.
// Renders NOTHING once milestone 6 completes.

const CATEGORY_ORDER = ['Warehouses', 'Items', 'Fleet Assets', 'Inventory', 'Orders'];

export function ActivationBanner({ mode }: { mode: 'compact' | 'checklist' }) {
  const activationQ = useActivationState();
  const state = activationQ.data;
  if (!state || state.m6_completed || !state.banner.visible) return null;

  const n = state.n_of_5;
  const pct = state.pct_complete;

  if (mode === 'compact') {
    return (
      <div
        role="banner"
        data-testid="activation-banner"
        className="flex flex-wrap items-center justify-between gap-3 border border-[#c8ddd5] border-l-4 border-l-[#087f72] bg-[#f7fbf9] px-4 py-3"
      >
        <div>
          {n < 5 ? (
            <p className="text-sm font-semibold leading-6 text-[#25483f]">
              Welcome back. You&apos;re {pct}% through onboarding — {5 - n} step
              {5 - n === 1 ? '' : 's'} remaining ({CATEGORY_ORDER.slice(n).join(', ')}). Continue
              setup.
            </p>
          ) : (
            <p className="text-sm font-semibold leading-6 text-[#25483f]">
              Welcome back. You&apos;re 80% through onboarding — run your first route optimization
              to complete setup.
            </p>
          )}
          <div className="mt-2 h-1 w-full max-w-[420px] overflow-hidden bg-[#dce8e3]">
            <div
              className="h-full bg-[#087f72]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <Link
          to={state.banner.cta ?? '/upload'}
          className="glow-ring inline-flex min-h-9 items-center justify-center bg-[#087f72] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#06675d]"
        >
          {n < 5 ? 'Continue setup' : 'Run your first route'}
        </Link>
      </div>
    );
  }

  return (
    <div
      role="banner"
      data-testid="activation-checklist"
      className="border border-[#c8ddd5] bg-[#f7fbf9] p-4"
    >
      {n < 5 ? (
        <p className="text-sm font-semibold leading-6 text-[#25483f]">
          You&apos;re viewing a demo workspace with sample data. Upload your real CSVs to start
          replacing the demo with your operation — {n} of 5 categories is yours.
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold leading-6 text-[#25483f]">
            Welcome back. You&apos;re 80% through onboarding — run your first route optimization to
            complete setup.
          </p>
          <Link
            to="/routes"
            className="glow-ring inline-flex min-h-9 items-center justify-center bg-[#087f72] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#06675d]"
          >
            Run your first route
          </Link>
        </div>
      )}

      <div className="mt-4 grid gap-2 md:grid-cols-5">
        {state.milestones.map((milestone, index) => {
          const chipTone =
            milestone.status === 'real'
              ? 'border-[#b9dcd1] bg-[#edf8f3] text-[#14745f]'
              : milestone.status === 'sample'
                ? 'border-[#e7d1a8] bg-[#fcf6e9] text-[#885100]'
                : 'border-[#d7dfdc] bg-white text-[#63766f]';
          return (
            <div
              key={milestone.category}
              data-testid={`milestone-chip-${milestone.category}`}
              className={`border px-3 py-2.5 ${chipTone}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide">
                  Step {index + 1}
                </p>
                <span className="border border-current/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                  {milestone.status}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold">{milestone.label}</p>
              {index === n && !state.m6_completed ? (
                <p className="mt-1 text-[11px] font-semibold text-[#087f72]">next step</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-4 h-1 overflow-hidden bg-[#dce8e3]">
        <div
          className="h-full bg-[#087f72]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-[#5b6d66]">
        {n < 5 ? `${5 - n} step${5 - n === 1 ? '' : 's'} remaining.` : 'Run your first route optimization to complete setup.'}
      </p>
    </div>
  );
}


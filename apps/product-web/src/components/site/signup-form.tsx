'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { companySignup, type SignupTier } from '@/lib/company-signup';
import { cn } from '@/lib/cn';
import { trackEvent } from '@/components/site/site-analytics';
import {
  externalLinks,
  signupFormNote,
  signupFormSubline,
  signupSuccessMessage,
} from '@/lib/site-content';

// react-hook-form reports an unchecked radio group as null (or '') — accept
// both, then normalize to undefined so the unset tier is truly optional
// (blueprint §1.10).
const launchSchema = z.object({
  company_name: z.string().min(2, 'Enter your company name.'),
  company_email: z.string().email('Use a valid company email.'),
  full_name: z.string().optional(),
  password: z.string().min(8, 'Use at least 8 characters.'),
  subscription_tier: z
    .union([z.enum(['starter', 'scale', 'enterprise']), z.literal(''), z.null()])
    .optional()
    .transform((value) => (value === '' || value === null ? undefined : value)),
});

type LaunchInput = z.input<typeof launchSchema>;
type LaunchValues = z.output<typeof launchSchema>;

const launchOptions: Array<{ value: SignupTier; label: string }> = [
  { value: 'starter', label: 'Starter — 4,500 ETB/month' },
  { value: 'scale', label: 'Scale — 10,000 ETB/quarter' },
  { value: 'enterprise', label: 'Enterprise — 45,000 ETB/quarter' },
];

const fieldClassName =
  'peer min-h-12 w-full border border-[#cfd9d5] bg-white px-3 pb-2.5 pt-6 text-base text-[#202b36] outline-none transition placeholder:text-transparent focus:border-[#087f72] focus:ring-2 focus:ring-[#087f72]/15 sm:text-sm';

export function SignupForm() {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<'success' | 'error' | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LaunchInput, unknown, LaunchValues>({
    resolver: zodResolver(launchSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatusMessage(null);
    setStatusTone(null);

    // the funnel's primary conversion point. No-ops when analytics is
    // unconfigured, and never carries form contents — only the fact that the
    // submit happened.
    trackEvent('start_free_click');

    try {
      await companySignup({
        company_name: values.company_name,
        company_email: values.company_email,
        password: values.password,
        ...(values.full_name ? { full_name: values.full_name } : {}),
        ...(values.subscription_tier ? { subscription_tier: values.subscription_tier } : {}),
      });

      trackEvent('signup_success');
      setStatusTone('success');
      setStatusMessage(signupSuccessMessage);
      // The ops console bootstraps the session from the supply_chain_token
      // cookie (AuthContext → /auth/me → /); same-site it lands on the
      // workspace, otherwise on its existing /login.
      window.location.assign(externalLinks.console);
    } catch (error) {
      // Distinguish a rejected signup from a broken funnel: the behaviour
      // contract requires launch-form errors to be visible within minutes, and
      // an error count that includes validation failures would be noise.
      trackEvent('signup_error', {
        reason: error instanceof Error && error.message ? 'api_error' : 'unknown',
      });
      setStatusTone('error');
      setStatusMessage(error instanceof Error ? error.message : 'Could not create the company workspace.');
    }
  });

  return (
    <div className="border border-[#d7dfdc] bg-white px-5 py-5 sm:px-6 sm:py-6">
      <div>
        <p className="kicker">Launch</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-[#172a24]">Start free</h2>
        <p className="mt-1.5 text-sm leading-6 text-[#5b6d66]">{signupFormSubline}</p>
        <p className="mt-1 text-xs text-[#63766f]">{signupFormNote}</p>
      </div>

      {/* noValidate: the zod schema is the single validation source
          (native constraint validation would block jsdom submissions). */}
      <form className="mt-6 space-y-5" onSubmit={onSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" error={errors.company_name?.message}>
            <input className={fieldClassName} placeholder="Company name" {...register('company_name')} />
          </Field>
          <Field label="Full name (optional)" error={errors.full_name?.message}>
            <input className={fieldClassName} placeholder="Full name (optional)" {...register('full_name')} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company email" error={errors.company_email?.message}>
            <input className={fieldClassName} placeholder="Company email" type="email" {...register('company_email')} />
          </Field>
          <Field label="Password" error={errors.password?.message}>
            <input className={fieldClassName} placeholder="Password" type="password" {...register('password')} />
          </Field>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#63766f]">
            Tier <span className="font-normal normal-case tracking-normal text-[#63766f]">— Optional — choose a tier later inside your workspace.</span>
          </p>
          <div className="grid gap-3 lg:grid-cols-3">
            {launchOptions.map((option) => (
              <label
                key={option.value}
                className="cursor-pointer border border-[#d7dfdc] bg-[#f8faf9] px-3 py-3 text-xs text-[#52665e] transition has-[:checked]:border-[#087f72] has-[:checked]:bg-[#edf8f3] has-[:checked]:text-[#172a24]"
              >
                <input type="radio" value={option.value} className="sr-only" {...register('subscription_tier')} />
                <span className="block">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="group inline-flex min-h-11 w-full items-center justify-center gap-2 bg-[#087f72] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#06675d] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          {isSubmitting ? 'Creating workspace...' : 'Start free'}
        </button>

        {statusMessage ? (
          <div
            role="status"
            className={cn(
              'border px-3 py-3 text-sm leading-6',
              statusTone === 'success'
                ? 'border-[#b9dcd1] bg-[#f3faf7] text-[#14745f]'
                : 'border-[#e7c2be] bg-[#fff8f7] text-[#8f302a]',
            )}
          >
            {statusMessage}
          </div>
        ) : null}
      </form>
    </div>
  );
}

function Field({
  children,
  label,
  error,
}: {
  children: React.ReactNode;
  label: string;
  error?: string;
}) {
  return (
    <label className="relative block">
      {children}
      <span className="pointer-events-none absolute left-3 top-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#63766f] transition peer-focus:text-[#087f72]">
        {label}
      </span>
      {error ? <span className="mt-1.5 block text-xs text-[#8f302a]">{error}</span> : null}
    </label>
  );
}

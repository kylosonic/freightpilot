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
  'peer min-h-12 w-full rounded-md border border-[#dfdeda] bg-white px-3 pb-2.5 pt-6 text-base text-[#252522] outline-none transition placeholder:text-transparent focus:border-[#176b5c] focus:ring-2 focus:ring-[#176b5c]/15 sm:text-sm';

export function safeConsoleRedirect(value: string, nodeEnv = process.env.NODE_ENV): string {
  try {
    const target = new URL(value);
    if (target.username || target.password) return '';
    if (target.protocol === 'https:') return value;
    const localHost = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(target.hostname);
    if (nodeEnv !== 'production' && target.protocol === 'http:' && localHost) {
      return value;
    }
  } catch {
    return '';
  }
  return '';
}

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
      const consoleUrl = safeConsoleRedirect(externalLinks.console);
      if (!consoleUrl) {
        setStatusTone('error');
        setStatusMessage('Your workspace is ready, but the console address needs to be fixed. Please contact support.');
        return;
      }
      // The ops console bootstraps the session from the supply_chain_token
      // cookie (AuthContext → /auth/me → /); same-site it lands on the
      // workspace, otherwise on its existing /login.
      window.location.assign(consoleUrl);
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
    <div className="rounded-lg border border-[#e5e4e0] bg-white px-5 py-6 sm:px-7 sm:py-7">
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#252522]">Start free</h2>
        <p className="mt-2 text-sm leading-6 text-[#73736e]">{signupFormSubline}</p>
        <p className="mt-1 text-xs text-[#85857e]">{signupFormNote}</p>
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
          <p className="text-[13px] font-medium text-[#454540]">
            Tier <span className="font-normal text-[#85857e]">— Optional — choose a tier later inside your workspace.</span>
          </p>
          <div className="grid gap-3 lg:grid-cols-3">
            {launchOptions.map((option) => (
              <label
                key={option.value}
                className="cursor-pointer rounded-md border border-[#e5e4e0] bg-white px-3 py-3 text-xs text-[#5f5f59] transition hover:bg-[#f9f9f7] has-[:checked]:border-[#7fae9f] has-[:checked]:bg-[#f3f8f5] has-[:checked]:text-[#252522]"
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
          className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#087f72] px-5 text-sm font-medium text-white transition-colors hover:bg-[#176b5c] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          {isSubmitting ? 'Creating workspace...' : 'Start free'}
        </button>

        {statusMessage ? (
          <div
            role="status"
            className={cn(
              'rounded-md border px-3 py-3 text-sm leading-6',
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
      <span className="pointer-events-none absolute left-3 top-2 text-[11px] font-medium text-[#73736e] transition peer-focus:text-[#176b5c]">
        {label}
      </span>
      {error ? <span className="mt-1.5 block text-xs text-[#8f302a]">{error}</span> : null}
    </label>
  );
}

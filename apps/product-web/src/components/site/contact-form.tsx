'use client';

import { useState } from 'react';
import { CheckCircle2, LoaderCircle, Send } from 'lucide-react';

import { cn } from '@/lib/cn';

const CONTACT_ENDPOINT =
  process.env.NEXT_PUBLIC_CONTACT_FORM_ENDPOINT || '';

export function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('loading');

    const form = e.currentTarget;
    const formData = new FormData(form);
    if (!CONTACT_ENDPOINT) {
      setStatus('error');
      return;
    }

    formData.append('_subject', 'New Contact Request from FreightPilot Website');

    try {
      const response = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: formData,
      });

      if (response.ok) {
        setStatus('success');
        form.reset();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-[#b9dcd1] bg-[#f3faf7] p-8 text-center sm:p-10"
      >
        <CheckCircle2 className="h-10 w-10 text-[#14745f]" aria-hidden="true" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-[#252522]">Message sent</h3>
          <p className="text-sm text-[#5f5f59]">
            Thank you for reaching out. Replies are manual and may take a few days.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="site-action-secondary mt-2"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="contact-name" className="text-xs font-medium text-[#454540]">
            Full Name
          </label>
          <input
            id="contact-name"
            name="name"
            required
            type="text"
            autoComplete="name"
            className="fp-site-input"
            placeholder="Jane Doe"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="contact-email" className="text-xs font-medium text-[#454540]">
            Work Email
          </label>
          <input
            id="contact-email"
            name="email"
            required
            type="email"
            autoComplete="email"
            className="fp-site-input"
            placeholder="jane@company.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="contact-company" className="text-xs font-medium text-[#454540]">
          Company Name
        </label>
        <input
          id="contact-company"
          name="company"
          required
          type="text"
          autoComplete="organization"
          className="fp-site-input"
          placeholder="Acme Logistics"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="contact-message" className="text-xs font-medium text-[#454540]">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={4}
          className="fp-site-input resize-none"
          placeholder="How can we help your team?"
        />
      </div>

      {status === 'error' ? (
        <p role="alert" className="rounded-md border border-[#e7c2be] bg-[#fff8f7] px-3.5 py-2.5 text-sm text-[#8f302a]">
          Something went wrong. Please try again later.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === 'loading'}
        className={cn(
          'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#087f72] px-5 text-sm font-medium text-white transition-colors',
          status === 'loading' ? 'cursor-not-allowed opacity-70' : 'hover:bg-[#176b5c]',
        )}
      >
        {status === 'loading' ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            Sending...
          </>
        ) : (
          <>
            Send Message
            <Send className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
}

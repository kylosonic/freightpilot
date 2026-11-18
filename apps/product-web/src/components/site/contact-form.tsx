'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';

import { cn } from '@/lib/cn';

const CONTACT_ENDPOINT =
  process.env.NEXT_PUBLIC_CONTACT_FORM_ENDPOINT || 'https://formsubmit.co/ajax/nahomgwmichael@gmail.com';

export function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('loading');

    const form = e.currentTarget;
    const formData = new FormData(form);
    
    // We inject the subject and other formsubmit config fields
    formData.append('_subject', 'New Contact Request from FreightPilot Website');
    formData.append('_captcha', 'false');

    try {
      const response = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      });

      if (response.ok) {
        setStatus('success');
        form.reset();
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 border border-[#b9dcd1] bg-[#f3faf7] p-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-[#14745f]" aria-hidden="true" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-[#172a24]">Message sent</h3>
          <p className="text-sm text-[#5b6d66]">
            Thank you for reaching out. Our team will get back to you shortly.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-4 border border-[#cfd9d5] bg-white px-4 py-2 text-xs font-semibold text-[#40534c] transition hover:bg-[#eef3f0]"
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
          <label htmlFor="name" className="text-xs font-semibold text-[#40534c]">
            Full Name
          </label>
          <input
            id="name"
            name="name"
            required
            type="text"
            className="fp-site-input"
            placeholder="Jane Doe"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-xs font-semibold text-[#40534c]">
            Work Email
          </label>
          <input
            id="email"
            name="email"
            required
            type="email"
            className="fp-site-input"
            placeholder="jane@company.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="company" className="text-xs font-semibold text-[#40534c]">
          Company Name
        </label>
        <input
          id="company"
          name="company"
          required
          type="text"
          className="fp-site-input"
          placeholder="Acme Logistics"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="message" className="text-xs font-semibold text-[#40534c]">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={4}
          className="fp-site-input resize-none"
          placeholder="How can we help your team?"
        />
      </div>

      {status === 'error' && (
        <p role="alert" className="text-sm text-[#8f302a]">
          Something went wrong. Please try again later.
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className={cn(
          'inline-flex min-h-11 w-full items-center justify-center gap-2 bg-[#087f72] px-6 text-sm font-semibold text-white transition-colors',
          status === 'loading' ? 'cursor-not-allowed opacity-70' : 'hover:bg-[#06675d]'
        )}
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
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

import React, { useState } from 'react';
import { submitFeedback } from '../services/logisticsApi';

export function FeedbackForm() {
  const [category, setCategory] = useState('freight_invoice_reconciliation');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      await submitFeedback({ category, message, user_email: email });
      setStatus('success');
      setMessage('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <section aria-labelledby="pilot-feedback-heading">
      <h2 id="pilot-feedback-heading" className="text-[15px] font-semibold text-[#252522]">Pilot feedback</h2>
      <p className="mt-1 text-xs leading-5 text-[#73736e]">Share what works well or what the team should improve.</p>
      {status === 'success' ? (
        <div role="status" className="mt-4 rounded-md border border-[#cfe5db] bg-[#f2f7f4] p-3 text-sm text-[#14745f]">
          <p>Thank you for your feedback! It helps us improve the platform.</p>
          <button
            type="button"
            onClick={() => setStatus('idle')}
            className="mt-2 text-xs font-semibold text-[#176b5c] underline-offset-4 hover:underline"
          >
            Send another note
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="feedback-category" className="mb-1.5 block text-xs font-medium text-[#454540]">Category</label>
            <select
              id="feedback-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="fp-input"
            >
              <option value="freight_invoice_reconciliation">Carrier invoice check</option>
              <option value="dock_management">Dock management</option>
              <option value="route_optimization">Route optimization</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="feedback-message" className="mb-1.5 block text-xs font-medium text-[#454540]">Feedback message</label>
            <textarea
              id="feedback-message"
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what works well or what could be improved..."
              className="fp-input"
            />
          </div>
          <div>
            <label htmlFor="feedback-email" className="mb-1.5 block text-xs font-medium text-[#454540]">Email (optional)</label>
            <input
              id="feedback-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@freightpilot.app"
              className="fp-input"
            />
          </div>
          {status === 'error' && <p role="alert" className="rounded-md border border-[#e7c2be] bg-[#fff8f7] px-3 py-2 text-xs text-[#a3342f]">Failed to submit feedback. Try again.</p>}
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="fp-action-secondary w-full"
          >
            {status === 'submitting' ? 'Submitting...' : 'Submit feedback'}
          </button>
        </form>
      )}
    </section>
  );
}

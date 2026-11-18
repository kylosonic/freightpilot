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
        <div className="mt-4 rounded-md bg-[#f2f7f4] p-3 text-sm text-[#14745f]">
          Thank you for your feedback! It helps us improve the platform.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#454540]">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="fp-input"
            >
              <option value="freight_invoice_reconciliation">Carrier invoice check</option>
              <option value="dock_management">Dock Management</option>
              <option value="route_optimization">Route Optimization</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#454540]">Feedback message</label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what works well or what could be improved..."
              className="fp-input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#454540]">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@logistics.co"
              className="fp-input"
            />
          </div>
          {status === 'error' && <p className="text-xs text-[#a3342f]">Failed to submit feedback. Try again.</p>}
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

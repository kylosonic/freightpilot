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
    <div className="w-full border border-[#d7dfdc] bg-white p-4">
      <h3 className="mb-3 text-xs font-semibold text-[#20372f]">Pilot feedback</h3>
      {status === 'success' ? (
        <div className="border border-[#b9dcd1] bg-[#f3faf7] p-3 text-xs text-[#14745f]">
          Thank you for your feedback! It helps us improve the platform.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7d76]">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="fp-input p-2"
            >
              <option value="freight_invoice_reconciliation">Freight Invoice Reconciliation</option>
              <option value="dock_management">Dock Management</option>
              <option value="route_optimization">Route Optimization</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7d76]">Feedback message</label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what works well or what could be improved..."
              className="fp-input p-2"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7d76]">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@logistics.co"
              className="fp-input p-2"
            />
          </div>
          {status === 'error' && <p className="text-xs text-[#a3342f]">Failed to submit feedback. Try again.</p>}
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="glow-ring inline-flex min-h-9 w-full items-center justify-center border border-[#087f72] bg-white px-4 text-xs font-semibold text-[#087f72] transition hover:bg-[#eef6f2] disabled:opacity-50"
          >
            {status === 'submitting' ? 'Submitting...' : 'Submit feedback'}
          </button>
        </form>
      )}
    </div>
  );
}

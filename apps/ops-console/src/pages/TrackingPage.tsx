import { useEffect, useState } from 'react';

import { getCustomerTracking } from '../services/dispatchApi';
import type { CustomerTrackingView } from '../types/api';

function formatTime(value: string | null): string {
  if (!value) return 'Not set';
  return new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const statusLabel: Record<string, string> = {
  planned: 'Preparing',
  assigned: 'Assigned',
  in_transit: 'On the way',
  delivered: 'Delivered',
  failed: 'Delivery issue',
  cancelled: 'Cancelled',
};

export function TrackingPage() {
  const fragment =
    typeof window === 'undefined' ? '' : window.location.hash.replace(/^#/, '');
  const token = new URLSearchParams(fragment).get('token') || '';
  const [tracking, setTracking] = useState<CustomerTrackingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('This tracking link is incomplete.');
      setLoading(false);
      return;
    }
    let active = true;
    async function load() {
      try {
        const next = await getCustomerTracking(token);
        if (!active) return;
        setTracking(next);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Could not load this delivery.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [token]);

  return (
    <main className="min-h-screen bg-[#f4f6f5] px-4 py-8 text-[#202b36]">
      <div className="mx-auto max-w-xl space-y-4">
        <header>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#087f72]">
            FreightPilot Tracking
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold text-[#172a24]">
            {tracking ? `Order ${tracking.order_no}` : 'Delivery status'}
          </h1>
        </header>

        {loading ? (
          <div className="space-y-3 border border-[#d7dfdc] bg-white p-5" role="status">
            <div className="skeleton h-6 w-1/2" />
            <div className="skeleton h-20" />
          </div>
        ) : null}

        {error ? (
          <p className="border border-[#e7c2be] bg-[#fff8f7] p-4 text-sm text-[#8f302a]">
            {error}
          </p>
        ) : null}

        {tracking ? (
          <section className="space-y-4 border border-[#d7dfdc] bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-[#63766f]">{tracking.customer_name}</p>
                <p className="mt-1 text-xl font-semibold text-[#172a24]">
                  {statusLabel[tracking.status] ?? tracking.status}
                </p>
              </div>
              <span className="border border-[#bfd8e5] bg-[#f3f9fc] px-2 py-1 text-[10px] font-semibold text-[#17679b]">
                {tracking.proof_available ? 'Proof recorded' : 'Proof pending'}
              </span>
            </div>

            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#6b7d76]">Estimated arrival</p>
                <p className="mt-1 text-xs font-medium text-[#20372f]">{formatTime(tracking.planned_arrival)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#6b7d76]">Delivery window</p>
                <p className="mt-1 text-xs font-medium text-[#20372f]">
                  {formatTime(tracking.window_start)} to {formatTime(tracking.window_end)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#6b7d76]">Route</p>
                <p className="mt-1 text-xs font-medium text-[#20372f]">{tracking.route_name ?? 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#6b7d76]">Driver</p>
                <p className="mt-1 text-xs font-medium text-[#20372f]">{tracking.driver_name ?? 'Not assigned'}</p>
              </div>
            </div>

            <p className="border-t border-[#e6ebe8] pt-3 text-[11px] text-[#63766f]">
              Last updated {formatTime(tracking.updated_at)}
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}

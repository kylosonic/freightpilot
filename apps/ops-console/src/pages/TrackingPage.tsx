import { useEffect, useState } from 'react';

import { StatusBadge } from '../components/ui/StatusBadge';
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
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-8 text-[#252522]">
      <div className="mx-auto max-w-xl space-y-4">
        <header>
          <div className="inline-flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-[#2e4f47] text-[11px] font-semibold text-white">FP</span>
            <p className="text-xs font-medium text-[#5f5f59]">FreightPilot Tracking</p>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-[#252522]">
            {tracking ? `Order ${tracking.order_no}` : 'Delivery status'}
          </h1>
        </header>

        {loading ? (
          <div className="space-y-3 rounded-lg border border-[#e5e4e0] bg-white p-5" role="status">
            <div className="skeleton h-6 w-1/2" />
            <div className="skeleton h-20" />
            <span className="sr-only">Loading delivery status...</span>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-md border border-[#e7c2be] bg-[#fff8f7] p-4 text-sm text-[#8f302a]">
            {error}
          </p>
        ) : null}

        {tracking ? (
          <section className="space-y-4 rounded-lg border border-[#e5e4e0] bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-[#73736e]">{tracking.customer_name}</p>
                <p className="mt-1 text-xl font-semibold text-[#252522]">
                  {statusLabel[tracking.status] ?? tracking.status}
                </p>
              </div>
              <StatusBadge
                label={tracking.proof_available ? 'Proof recorded' : 'Proof pending'}
                tone={tracking.proof_available ? 'success' : 'info'}
              />
            </div>

            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-medium text-[#73736e]">Estimated arrival</p>
                <p className="mt-1 text-xs font-medium text-[#252522]">{formatTime(tracking.planned_arrival)}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#73736e]">Delivery window</p>
                <p className="mt-1 text-xs font-medium text-[#252522]">
                  {formatTime(tracking.window_start)} to {formatTime(tracking.window_end)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#73736e]">Route</p>
                <p className="mt-1 text-xs font-medium text-[#252522]">{tracking.route_name ?? 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#73736e]">Driver</p>
                <p className="mt-1 text-xs font-medium text-[#252522]">{tracking.driver_name ?? 'Not assigned'}</p>
              </div>
            </div>

            <p className="border-t border-[#efeeea] pt-3 text-[11px] text-[#73736e]">
              Last updated {formatTime(tracking.updated_at)}
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}

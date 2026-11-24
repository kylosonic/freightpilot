'use client';

import { useEffect, useState } from 'react';

type ProbeState = {
  state: 'checking' | 'ok' | 'degraded' | 'unreachable';
  db: string | null;
  checkedAt: string | null;
};

const apiBase = (process.env.NEXT_PUBLIC_PLATFORM_API_URL || '').replace(/\/$/, '');
const healthUrl = apiBase ? `${apiBase.replace(/\/api\/v1$/, '')}/health` : '';

export function StatusProbe() {
  const [probe, setProbe] = useState<ProbeState>({
    state: 'checking',
    db: null,
    checkedAt: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!healthUrl) {
        setProbe({ state: 'unreachable', db: null, checkedAt: null });
        return;
      }
      try {
        const response = await fetch(healthUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Health probe returned ${response.status}`);
        const body = (await response.json()) as { status?: string; db?: string };
        if (cancelled) return;
        setProbe({
          state: body.status === 'ok' && body.db === 'ok' ? 'ok' : 'degraded',
          db: body.db ?? null,
          checkedAt: new Date().toISOString(),
        });
      } catch {
        if (cancelled) return;
        setProbe({ state: 'unreachable', db: null, checkedAt: new Date().toISOString() });
      }
    }

    void check();
    const timer = window.setInterval(check, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const label = {
    checking: 'Checking…',
    ok: 'All reported checks healthy',
    degraded: 'Service reachable, database degraded',
    unreachable: 'Status probe unavailable',
  }[probe.state];

  return (
    <div className="rounded-lg border border-[#e5e4e0] bg-white p-5 sm:p-6" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">Platform API</p>
          <p className="mt-1.5 text-lg font-semibold text-[#252522]">{label}</p>
        </div>
        <span
          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
            probe.state === 'ok'
              ? 'border-[#b9dcd1] bg-[#edf7f1] text-[#14745f]'
              : probe.state === 'checking'
                ? 'border-[#e5e4e0] bg-[#f7f7f5] text-[#5f5f59]'
                : 'border-[#e7d1a8] bg-[#fcf5e7] text-[#885100]'
          }`}
        >
          {probe.state.toUpperCase()}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#5f5f59]">
        Database: {probe.db ?? 'not reported'} · Last checked:{' '}
        {probe.checkedAt ? new Date(probe.checkedAt).toLocaleString() : 'pending'}
      </p>
      <p className="mt-2 text-xs leading-5 text-[#73736e]">
        This probe is intentionally limited to the public health endpoint. It is not a substitute
        for an incident notification or a contractual support channel.
      </p>
    </div>
  );
}

import {
  BellRing,
  CalendarClock,
  ChevronRight,
  CircleAlert,
  MoreHorizontal,
  PackageCheck,
  Route,
  Truck,
} from 'lucide-react';

const stops = [
  { sequence: '01', name: 'Bole warehouse', code: 'WH-001', time: '08:30', state: 'Departed', tone: 'done' },
  { sequence: '02', name: 'Kazanchis retail', code: 'WH-003', time: '09:15', state: 'In transit', tone: 'active' },
  { sequence: '03', name: 'Megenagna store', code: 'WH-006', time: '10:05', state: 'Planned', tone: 'planned' },
  { sequence: '04', name: 'Gerji customer', code: 'WH-008', time: '10:50', state: 'Planned', tone: 'planned' },
] as const;

const stateStyles = {
  done: 'border-[#b9dcd1] bg-[#edf8f3] text-[#14745f]',
  active: 'border-[#e7d1a8] bg-[#fffaf0] text-[#885100]',
  planned: 'border-[#d7dfdc] bg-[#f5f8f6] text-[#52665e]',
} as const;

export function WorkspacePreview() {
  return (
    <div className="min-w-0 overflow-hidden border border-[#cbd7d2] bg-white shadow-[0_16px_40px_rgba(31,57,49,0.10)]">
      <div className="flex h-9 items-center justify-between border-b border-[#dce4e0] bg-[#f5f8f6] px-3">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2 w-2 bg-[#b9c7c1]" />
          <span className="h-2 w-2 bg-[#b9c7c1]" />
          <span className="h-2 w-2 bg-[#b9c7c1]" />
        </div>
        <span className="font-mono text-[9px] text-[#6b7d76]">freightpilot / control-tower</span>
        <MoreHorizontal className="h-3.5 w-3.5 text-[#6b7d76]" aria-hidden="true" />
      </div>

      <div className="grid grid-cols-[112px_minmax(0,1fr)] sm:grid-cols-[134px_minmax(0,1fr)]">
        <aside className="border-r border-[#dce4e0] bg-[#fbfcfb] p-2.5 sm:p-3">
          <div className="flex items-center gap-2 border-b border-[#e2e8e5] pb-3">
            <span className="grid h-6 w-6 place-items-center bg-[#153f3a] text-[9px] font-bold text-white">FP</span>
            <span className="hidden text-[10px] font-semibold text-[#20372f] sm:block">FreightPilot</span>
          </div>
          <div className="mt-3 space-y-0.5">
            <div className="flex items-center gap-2 border-l-2 border-[#087f72] bg-[#e8f3ef] px-2 py-1.5 text-[9px] font-semibold text-[#0e3e38]">
              <Route className="h-3 w-3 text-[#087f72]" aria-hidden="true" />
              Control Tower
            </div>
            {[
              { Icon: CalendarClock, label: 'Shipments' },
              { Icon: Truck, label: 'Dispatch' },
              { Icon: BellRing, label: 'Exceptions' },
              { Icon: PackageCheck, label: 'Fleet & cash' },
            ].map(({ Icon, label }) => (
              <div key={label} className="flex items-center gap-2 px-2 py-1.5 text-[9px] text-[#63766f]">
                <Icon className="h-3 w-3" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0 bg-[#f4f6f5]">
          <div className="flex items-center justify-between border-b border-[#dce4e0] bg-white px-3 py-2.5 sm:px-4">
            <div>
              <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-[#63766f]">Control tower</p>
              <p className="mt-0.5 text-[11px] font-semibold text-[#20372f]">Today&apos;s operation</p>
            </div>
            <span className="flex items-center gap-1.5 text-[8px] text-[#63766f]">
              <span className="h-1.5 w-1.5 bg-[#16856b]" aria-hidden="true" />
              Updated 09:42
            </span>
          </div>

          <div className="p-2.5 sm:p-3">
            <div className="grid grid-cols-3 border border-[#d7dfdc] bg-white">
              {[
                { label: 'Needs attention', value: '3', tone: 'text-[#885100]' },
                { label: 'In transit', value: '8', tone: 'text-[#172a24]' },
                { label: 'Delivered', value: '24', tone: 'text-[#14745f]' },
              ].map((metric) => (
                <div key={metric.label} className="border-r border-[#e2e8e5] px-2 py-2 last:border-r-0">
                  <p className="text-[7px] font-semibold uppercase tracking-[0.06em] text-[#63766f]">{metric.label}</p>
                  <p className={`mt-0.5 font-mono text-base leading-5 ${metric.tone}`}>{metric.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-2 grid gap-2 min-[440px]:grid-cols-[0.9fr_1.1fr]">
              <div className="relative min-h-[152px] overflow-hidden border border-[#d7dfdc] bg-[#e9efeb]">
                <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(#cbd8d1_1px,transparent_1px),linear-gradient(90deg,#cbd8d1_1px,transparent_1px)] [background-size:24px_24px]" />
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 220 160" fill="none" aria-hidden="true">
                  <path d="M18 129C46 113 57 95 82 99C103 103 104 70 126 67C154 63 162 39 199 35" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" />
                  <path d="M18 129C46 113 57 95 82 99C103 103 104 70 126 67C154 63 162 39 199 35" stroke="#087f72" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M18 129C46 113 57 95 82 99C103 103 104 70 126 67" stroke="#d5a83e" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                {[
                  { left: '7%', top: '76%', label: '1', done: true },
                  { left: '35%', top: '59%', label: '2', done: true },
                  { left: '56%', top: '39%', label: '3', done: false },
                  { left: '88%', top: '19%', label: '4', done: false },
                ].map((stop) => (
                  <span
                    key={stop.label}
                    className={`absolute grid h-4 w-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-[7px] font-bold text-white ${stop.done ? 'bg-[#087f72]' : 'bg-[#a15b00]'}`}
                    style={{ left: stop.left, top: stop.top }}
                  >
                    {stop.label}
                  </span>
                ))}
                <div className="absolute bottom-2 left-2 border border-[#d7dfdc] bg-white px-2 py-1">
                  <p className="text-[7px] uppercase tracking-wide text-[#63766f]">Route</p>
                  <p className="text-[9px] font-semibold text-[#20372f]">Addis · North loop</p>
                </div>
              </div>

              <div className="border border-[#d7dfdc] bg-white">
                <div className="flex items-center justify-between border-b border-[#e2e8e5] px-2 py-1.5">
                  <p className="text-[9px] font-semibold text-[#20372f]">Next stops</p>
                  <span className="text-[7px] text-[#63766f]">4</span>
                </div>
                <div>
                  {stops.map((stop) => (
                    <div key={stop.sequence} className="flex items-center gap-1.5 border-b border-[#e9eeeb] px-2 py-1.5 last:border-b-0">
                      <span className="grid h-4 w-4 shrink-0 place-items-center bg-[#f1f5f3] font-mono text-[7px] text-[#52665e]">
                        {stop.sequence}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[8px] font-semibold text-[#20372f]">{stop.name}</p>
                        <p className="font-mono text-[7px] text-[#63766f]">{stop.code} · {stop.time}</p>
                      </div>
                      <span className={`border px-1 py-0.5 text-[6px] font-semibold ${stateStyles[stop.tone]}`}>
                        {stop.state}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between border border-[#e7d1a8] bg-[#fffaf0] px-2 py-1.5">
              <span className="flex min-w-0 items-center gap-1.5 text-[8px] font-medium text-[#704500]">
                <CircleAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">Cash shortfall on stop 2 needs review</span>
              </span>
              <ChevronRight className="h-3 w-3 shrink-0 text-[#885100]" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

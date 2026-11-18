import {
  BellRing,
  CalendarClock,
  ChevronRight,
  CircleAlert,
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
  done: 'bg-[#edf7f1] text-[#14745f]',
  active: 'bg-[#fff7e9] text-[#885100]',
  planned: 'bg-[#f5f5f2] text-[#5f5f59]',
} as const;

export function WorkspacePreview() {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl bg-[#f7f7f5] p-[3px] sm:p-1" aria-label="freightpilot / control-tower workspace preview">
      <div className="overflow-hidden rounded-[10px] bg-white shadow-[0_8px_28px_rgba(35,35,30,0.07)]">
      <div className="grid grid-cols-[92px_minmax(0,1fr)] sm:grid-cols-[176px_minmax(0,1fr)]">
        <aside className="border-r border-[#f1f0ed] bg-[#fbfbfa] p-2 sm:p-3">
          <div className="flex items-center gap-2 px-1 pb-3">
            <span className="grid h-5 w-5 place-items-center rounded bg-[#2e4f47] text-[8px] font-semibold text-white">FP</span>
            <span className="hidden text-[10px] font-medium text-[#353530] sm:block">FreightPilot</span>
          </div>
          <div className="mt-2 space-y-0.5">
            <div className="flex items-center gap-2 rounded bg-[#efefec] px-2 py-1.5 text-[9px] font-medium text-[#252522]">
              <Route className="h-3 w-3 text-[#087f72]" aria-hidden="true" />
              <span className="hidden sm:inline">Overview</span>
            </div>
            {[
              { Icon: Route, label: 'Routes' },
              { Icon: CalendarClock, label: 'Shipments' },
              { Icon: Truck, label: 'Dispatch' },
              { Icon: BellRing, label: 'Exceptions' },
              { Icon: PackageCheck, label: 'Fleet & cash' },
            ].map(({ Icon, label }) => (
              <div key={label} className="flex items-center gap-2 rounded px-2 py-1.5 text-[9px] text-[#73736e]">
                <Icon className="h-3 w-3" aria-hidden="true" />
                <span className="hidden truncate sm:inline">{label}</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex items-center justify-between bg-white px-3 py-3 sm:px-5">
            <div>
              <p className="text-[8px] text-[#85857e]">Overview</p>
              <p className="mt-0.5 text-[11px] font-medium text-[#252522]">Good morning</p>
            </div>
            <span className="flex items-center gap-1.5 text-[8px] text-[#85857e]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4d9a83]" aria-hidden="true" />
              Updated 09:42
            </span>
          </div>

          <div className="bg-white px-2.5 pb-3 sm:px-5 sm:pb-5">
            <div className="grid grid-cols-3 rounded-md bg-[#f7f7f5]">
              {[
                { label: 'Needs attention', value: '3', tone: 'text-[#252522]' },
                { label: 'In transit', value: '8', tone: 'text-[#252522]' },
                { label: 'Delivered', value: '24', tone: 'text-[#252522]' },
              ].map((metric) => (
                <div key={metric.label} className="min-w-0 px-1.5 py-2 sm:px-3">
                  <p className="truncate text-[7px] text-[#85857e]">{metric.label}</p>
                  <p className={`mt-0.5 text-base font-semibold leading-5 tracking-[-0.02em] ${metric.tone}`}>{metric.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-2 grid gap-2 min-[440px]:grid-cols-[0.9fr_1.1fr]">
              <div className="relative min-h-[152px] overflow-hidden rounded-md bg-[#edf1ee]">
                <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(#d7dfda_1px,transparent_1px),linear-gradient(90deg,#d7dfda_1px,transparent_1px)] [background-size:24px_24px]" />
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
                <div className="absolute bottom-2 left-2 rounded bg-white/95 px-2 py-1 shadow-sm">
                  <p className="text-[7px] text-[#85857e]">Route</p>
                  <p className="text-[9px] font-medium text-[#252522]">Addis · North loop</p>
                </div>
              </div>

              <div className="rounded-md border border-[#efeeea] bg-white">
                <div className="flex items-center justify-between border-b border-[#efeeea] px-2 py-1.5">
                  <p className="text-[9px] font-medium text-[#252522]">Next stops</p>
                  <span className="text-[7px] text-[#85857e]">4</span>
                </div>
                <div>
                  {stops.map((stop) => (
                    <div key={stop.sequence} className="flex items-center gap-1.5 border-b border-[#f1f0ed] px-2 py-1.5 last:border-b-0">
                      <span className="grid h-4 w-4 shrink-0 place-items-center rounded bg-[#f5f5f2] text-[7px] text-[#73736e]">
                        {stop.sequence}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[8px] font-medium text-[#252522]">{stop.name}</p>
                        <p className="text-[7px] text-[#85857e]">{stop.code} · {stop.time}</p>
                      </div>
                      <span className={`whitespace-nowrap rounded-full px-1 py-0.5 text-[6px] font-medium ${stateStyles[stop.tone]}`}>
                        {stop.state}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between rounded-md bg-[#fff8eb] px-2 py-1.5">
              <span className="flex min-w-0 items-center gap-1.5 text-[8px] font-medium text-[#805100]">
                <CircleAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">Cash shortfall on stop 2 needs review</span>
              </span>
              <ChevronRight className="h-3 w-3 shrink-0 text-[#805100]" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

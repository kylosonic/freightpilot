import {
  BellRing,
  CalendarClock,
  CircleDollarSign,
  ChevronsLeft,
  ChevronsRight,
  Database,
  FileCheck2,
  House,
  PlugZap,
  ReceiptText,
  Route,
  Settings2,
  Truck,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

import type { UserRead } from '../../types/auth';

type WorkspaceRailProps = {
  user: UserRead | null | undefined;
  onLogout: () => void | Promise<void>;
  onNavigate?: () => void;
  compact?: boolean;
  onToggleCompact?: () => void;
};

type RailItem = {
  to: string;
  label: string;
  code: string;
  Icon: LucideIcon;
};

const navGroups: Array<{ label: string; items: RailItem[] }> = [
  {
    label: 'Monitor',
    items: [
      { to: '/', label: 'Control Tower', code: 'CT', Icon: House },
      { to: '/alerts', label: 'Exceptions', code: 'EX', Icon: BellRing },
    ],
  },
  {
    label: 'Plan & execute',
    items: [
      { to: '/routes', label: 'Route Studio', code: 'RT', Icon: Route },
      { to: '/dispatch', label: 'Customer Dispatch', code: 'DP', Icon: Truck },
      { to: '/shipments', label: 'Shipments', code: 'SH', Icon: CalendarClock },
      { to: '/drivers', label: 'Fleet & Cash', code: 'FC', Icon: UsersRound },
      { to: '/planning', label: 'Planning', code: 'PL', Icon: FileCheck2 },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { to: '/upload', label: 'Data Intake', code: 'DI', Icon: Database },
      { to: '/receipts', label: 'Payments', code: 'PY', Icon: ReceiptText },
      { to: '/admin/receipts', label: 'Verification Queue', code: 'VQ', Icon: CircleDollarSign },
      { to: '/account', label: 'Workspace', code: 'WS', Icon: Settings2 },
      { to: '/providers', label: 'Integrations', code: 'IN', Icon: PlugZap },
    ],
  },
];

function RailLink({ item, onNavigate, compact = false }: { item: RailItem; onNavigate?: () => void; compact?: boolean }) {
  const { Icon } = item;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onNavigate}
      title={compact ? item.label : undefined}
      aria-label={compact ? item.label : undefined}
      className={({ isActive }) =>
        `group flex min-h-10 items-center border-l-2 transition-colors ${compact ? 'justify-center px-2' : 'gap-3 px-3'} ${compact ? 'py-2.5' : 'py-2'} text-[13px] ${
          isActive
            ? 'border-[#0c8d7e] bg-[#e6f3ef] font-semibold text-[#0e3e38]'
            : 'border-transparent text-[#40534c] hover:border-[#a9bbb4] hover:bg-[#f1f6f3] hover:text-[#172a24]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#087f72]' : 'text-[#63766f]'}`} aria-hidden="true" />
          {!compact ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
          {!compact ? <span className="font-mono text-[10px] text-[#7b8b85]" aria-hidden="true">{item.code}</span> : null}
        </>
      )}
    </NavLink>
  );
}

export function WorkspaceRail({ user, onLogout, onNavigate, compact = false, onToggleCompact }: WorkspaceRailProps) {
  const displayName = user?.full_name || user?.email || user?.username || 'Workspace member';
  const role = user?.role || 'viewer';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-[#d7dfdc] bg-[#fbfcfb] text-[#202b36]">
      <div className={`border-b border-[#d7dfdc] py-4 ${compact ? 'px-2' : 'px-5'}`}>
        <div className={`flex items-center ${compact ? 'flex-col gap-2' : 'justify-between gap-2'}`}>
        <Link to="/" className={`inline-flex items-center no-underline ${compact ? 'w-full justify-center' : 'gap-3'}`} onClick={onNavigate} aria-label="FreightPilot Control Tower">
          <span className="relative grid h-9 w-9 place-items-center bg-[#153f3a] text-[13px] font-bold text-white">
            FP
            <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 border-2 border-[#fbfcfb] bg-[#d5a83e]" aria-hidden="true" />
          </span>
          <span className={`grid gap-0.5 ${compact ? 'sr-only' : ''}`}>
            <strong className="text-[17px] font-semibold leading-5 text-[#172a24]">FreightPilot</strong>
            <span className="text-[11px] text-[#63766f]">Operations workspace</span>
          </span>
        </Link>
        {onToggleCompact ? (
          <button
            type="button"
            onClick={onToggleCompact}
            className="hidden h-7 w-7 shrink-0 items-center justify-center border border-[#d7dfdc] bg-white text-[#63766f] transition hover:bg-[#eef3f0] lg:flex"
            aria-label={compact ? 'Expand navigation' : 'Collapse navigation'}
            title={compact ? 'Expand navigation' : 'Collapse navigation'}
          >
            {compact ? <ChevronsRight className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronsLeft className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        ) : null}
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto py-4" aria-label="Workspace views">
        <div className="space-y-6">
          {navGroups.map((group) => (
            <section key={group.label} aria-labelledby={`rail-${group.label.replace(/\s+/g, '-').toLowerCase()}`}>
              <p id={`rail-${group.label.replace(/\s+/g, '-').toLowerCase()}`} className={`mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#73837d] ${compact ? 'sr-only' : 'px-5'}`}>
                {group.label}
              </p>
              <div className="grid">
                {group.items.map((item) => (
                  <RailLink key={item.to} item={item} onNavigate={onNavigate} compact={compact} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </nav>

      <div className={`border-t border-[#d7dfdc] py-3 ${compact ? 'px-2' : 'px-4'}`}>
        <div className={`flex items-center ${compact ? 'justify-center' : 'gap-3'}`}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e8eeeb] text-[11px] font-semibold text-[#29483f]">
            {initials || 'FP'}
          </span>
          {!compact ? <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[#20372f]">{displayName}</p>
            <p className="truncate text-[11px] capitalize text-[#63766f]">
              {role} · {user?.email || user?.username}
            </p>
          </div> : null}
        </div>
        <button
          type="button"
          onClick={onLogout}
          className={`mt-3 w-full border-t border-[#e1e7e4] pt-3 text-xs font-medium text-[#52665e] transition-colors hover:text-[#a33a31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087f72] ${compact ? 'text-center' : 'text-left'}`}
        >
          {compact ? 'Exit' : 'Logout'}
        </button>
      </div>
    </div>
  );
}

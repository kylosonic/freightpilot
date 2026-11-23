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
  Icon: LucideIcon;
};

const navGroups: Array<{ label: string; items: RailItem[] }> = [
  {
    label: 'Operate',
    items: [
      { to: '/', label: 'Overview', Icon: House },
      { to: '/routes', label: 'Routes', Icon: Route },
      { to: '/shipments', label: 'Shipments', Icon: CalendarClock },
      { to: '/dispatch', label: 'Dispatch', Icon: Truck },
      { to: '/alerts', label: 'Exceptions', Icon: BellRing },
      { to: '/planning', label: 'Planning', Icon: FileCheck2 },
      { to: '/drivers', label: 'Fleet and cash', Icon: UsersRound },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { to: '/upload', label: 'Import data', Icon: Database },
      { to: '/receipts', label: 'Payments', Icon: ReceiptText },
      { to: '/admin/receipts', label: 'Verify payments', Icon: CircleDollarSign },
      { to: '/account', label: 'Settings', Icon: Settings2 },
      { to: '/providers', label: 'Integrations', Icon: PlugZap },
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
        `group flex min-h-9 items-center rounded-md transition-colors ${compact ? 'justify-center px-2' : 'gap-2.5 px-2'} ${compact ? 'py-2.5' : 'py-1.5'} text-[14px] ${
          isActive
            ? 'bg-[#efefec] font-medium text-[#252522]'
            : 'text-[#5f5f59] hover:bg-[#f4f4f1] hover:text-[#252522]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`h-[17px] w-[17px] shrink-0 ${isActive ? 'text-[#3d5e55]' : 'text-[#85857e]'}`} aria-hidden="true" />
          {!compact ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
        </>
      )}
    </NavLink>
  );
}

export function WorkspaceRail({ user, onLogout, onNavigate, compact = false, onToggleCompact }: WorkspaceRailProps) {
  const displayName = user?.full_name || user?.email || user?.username || 'Workspace member';
  const role = user?.role || 'viewer';
  const canVerifyPayments = Boolean(user?.is_platform_admin);
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.to !== '/admin/receipts' || canVerifyPayments),
    }))
    .filter((group) => group.items.length > 0);
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f7f7f5] text-[#252522]">
      <div className={`py-4 ${compact ? 'px-2' : 'px-3'}`}>
        <div className={`flex items-center ${compact ? 'flex-col gap-2' : 'justify-between gap-2'}`}>
        <Link to="/" className={`inline-flex items-center rounded-md no-underline transition-colors hover:bg-[#efefec] ${compact ? 'w-full justify-center py-1' : 'gap-2 px-1 py-1'}`} onClick={onNavigate} aria-label="FreightPilot Overview">
          <span className="relative grid h-7 w-7 place-items-center rounded-md bg-[#2e4f47] text-[11px] font-semibold text-white">
            FP
          </span>
          <span className={`grid gap-0.5 ${compact ? 'sr-only' : ''}`}>
            <strong className="text-[14px] font-semibold leading-5 text-[#252522]">FreightPilot</strong>
            <span className="text-[11px] leading-4 text-[#73736e]">Operations workspace</span>
          </span>
        </Link>
        {onToggleCompact ? (
          <button
            type="button"
            onClick={onToggleCompact}
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#73736e] transition-colors hover:bg-[#efefec] hover:text-[#252522] lg:flex"
            aria-label={compact ? 'Expand navigation' : 'Collapse navigation'}
            title={compact ? 'Expand navigation' : 'Collapse navigation'}
          >
            {compact ? <ChevronsRight className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronsLeft className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        ) : null}
        </div>
      </div>

      <nav className={`min-h-0 flex-1 overflow-y-auto pb-4 pt-2 ${compact ? 'px-2' : 'px-3'}`} aria-label="Workspace views">
        <div className="space-y-5">
          {visibleGroups.map((group) => (
            <section key={group.label} aria-labelledby={`rail-${group.label.replace(/\s+/g, '-').toLowerCase()}`}>
              <p id={`rail-${group.label.replace(/\s+/g, '-').toLowerCase()}`} className={`mb-1.5 px-2 text-[12px] font-medium text-[#85857e] ${compact ? 'sr-only' : ''}`}>
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

      <div className={`py-3 ${compact ? 'px-2' : 'px-4'}`}>
        <div className={`flex items-center ${compact ? 'justify-center' : 'gap-2.5'}`}>
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#e9e9e5] text-[10px] font-medium text-[#42423d]">
            {initials || 'FP'}
          </span>
          {!compact ? <div className="min-w-0">
            <p className="truncate text-[12px] font-medium text-[#353530]">{displayName}</p>
            <p className="truncate text-[11px] capitalize text-[#73736e]">
              {role} · {user?.email || user?.username}
            </p>
          </div> : null}
        </div>
        <button
          type="button"
          onClick={onLogout}
          className={`mt-2 w-full rounded-md py-1.5 text-xs font-medium text-[#73736e] transition-colors hover:bg-[#efefec] hover:text-[#a33a31] ${compact ? 'text-center' : 'px-2 text-left'}`}
        >
          {compact ? 'Exit' : 'Log out'}
        </button>
      </div>
    </div>
  );
}

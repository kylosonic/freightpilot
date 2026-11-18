import { Menu, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { UserRead } from '../../types/auth';

type ShellHeaderProps = {
  contextLabel: string;
  descriptor: string;
  user: UserRead | null | undefined;
  onOpenNavigation: () => void;
};

export function ShellHeader({ contextLabel, descriptor, user, onOpenNavigation }: ShellHeaderProps) {
  const displayName = user?.full_name || user?.email || user?.username || 'Workspace member';

  return (
    <header className="sticky top-0 z-30 -mx-4 border-b border-[#d7dfdc] bg-[#fbfcfb]/95 px-4 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex min-h-[62px] flex-wrap items-center justify-between gap-3 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenNavigation}
            className="inline-grid h-10 w-10 place-items-center border border-[#cfd9d5] bg-white text-[#40534c] transition-colors hover:bg-[#eef3f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087f72] lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#63766f]">{contextLabel}</p>
              <span className="h-3 w-px bg-[#cbd5d1]" aria-hidden="true" />
              <p className="truncate text-sm font-semibold text-[#1f342d]">Live operations</p>
            </div>
            <p className="mt-0.5 hidden truncate text-xs text-[#63766f] sm:block">{descriptor}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SearchLink />
          {user ? (
            <div className="flex min-w-0 items-center gap-2 border-l border-[#d7dfdc] pl-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e6eeeb] text-[11px] font-semibold text-[#29483f]">
                {displayName.slice(0, 2).toUpperCase()}
              </span>
              <div className="hidden min-w-0 max-w-[180px] xl:block">
                <p className="truncate text-xs font-semibold text-[#20372f]">{displayName}</p>
                <p className="truncate font-mono text-[10px] uppercase text-[#63766f]">
                  {user.role} · {user.email || user.username}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function SearchLink() {
  return (
    <Link
      to="/shipments"
      className="hidden h-10 min-w-[170px] items-center gap-2 border border-[#d7dfdc] bg-white px-3 text-xs text-[#63766f] transition-colors hover:border-[#aebfb8] hover:text-[#20372f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087f72] sm:flex"
      aria-label="Find a shipment"
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">Find a shipment</span>
      <kbd className="border border-[#dbe3df] bg-[#f5f7f6] px-1.5 py-0.5 font-mono text-[10px] text-[#6c7c76]">/</kbd>
    </Link>
  );
}

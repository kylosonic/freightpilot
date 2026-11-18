import { Menu } from 'lucide-react';

import type { UserRead } from '../../types/auth';

type ShellHeaderProps = {
  contextLabel: string;
  descriptor: string;
  user: UserRead | null | undefined;
  onOpenNavigation: () => void;
};

export function ShellHeader({ contextLabel, descriptor, user, onOpenNavigation }: ShellHeaderProps) {
  const displayName = user?.full_name || user?.email || user?.username || 'Workspace member';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 -mx-4 bg-white/95 px-4 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex min-h-[54px] flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenNavigation}
            className="inline-grid h-9 w-9 place-items-center rounded-md text-[#5f5f59] transition-colors hover:bg-[#f1f1ef] lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-[#353530]">{contextLabel}</p>
            <p className="hidden truncate text-[11px] text-[#85857e] sm:block">{descriptor}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#efefec] text-[10px] font-medium text-[#42423d]">
                {initials}
              </span>
              <div className="hidden min-w-0 max-w-[180px] xl:block">
                <p className="truncate text-[12px] font-medium text-[#353530]">{displayName}</p>
                <p className="truncate text-[11px] capitalize text-[#85857e]">
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

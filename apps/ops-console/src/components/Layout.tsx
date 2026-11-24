import { Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { CapPitchBanner } from './ActivationBanner';
import { PageTransition } from './PageTransition';
import { ScrollManager } from './ScrollManager';
import { SessionLiveUpdates } from './shell/SessionLiveUpdates';
import { ShellHeader } from './shell/ShellHeader';
import { ShellSidebar } from './shell/ShellSidebar';

const SHELL_CONTEXT_LABEL = 'Freight operations';
const SHELL_DESCRIPTOR = 'Your routes, deliveries, and workspace.';

/** Lazy-chunk fallback rendered INSIDE the shell so the layout stays mounted
 *  while a page chunk loads (TECH-72). Also reused by App.tsx at the top
 *  level for the /login and /unauthorized lazy chunks.
 *  NB-58.3: calm console-language skeleton — never a bare text line; the
 *  verbatim copy stays available to screen readers via sr-only. */
export function RouteFallback() {
  return (
    <div className="fp-nested-surface px-5 py-5" role="status">
      <div className="skeleton h-6 w-1/3" />
      <div className="mt-4 grid gap-3">
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
      </div>
      <div className="mt-4 flex gap-3">
        <div className="skeleton h-4 w-1/4" />
        <div className="skeleton h-4 w-1/4" />
        <div className="skeleton h-4 w-1/4" />
      </div>
      <span className="sr-only">Loading workspace surface...</span>
    </div>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [railCompact, setRailCompact] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-white text-[#252522]">
      <SessionLiveUpdates />
      <ScrollManager />
      <a href="#main-content" className="skip-to-content">Skip to content</a>
      <div className="flex min-h-screen">
        <aside className={`hidden shrink-0 bg-[#f7f7f5] transition-[width] lg:block ${railCompact ? 'w-[64px]' : 'w-[240px]'}`}>
          <div className="sticky top-0 flex h-screen flex-col">
            <ShellSidebar
              user={user}
              onLogout={logout}
              compact={railCompact}
              onToggleCompact={() => setRailCompact((current) => !current)}
            />
          </div>
        </aside>

        {sidebarOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" className="absolute inset-0 bg-[#252522]/30" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />
            <aside role="dialog" aria-modal="true" aria-label="Workspace navigation" className="absolute inset-y-0 left-0 w-[290px] max-w-[85vw] overflow-y-auto bg-[#f7f7f5] shadow-xl">
              <ShellSidebar user={user} onLogout={logout} onNavigate={() => setSidebarOpen(false)} />
            </aside>
          </div>
        ) : null}

        <div className="min-w-0 flex-1 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1440px]">
            <ShellHeader
              contextLabel={SHELL_CONTEXT_LABEL}
              descriptor={SHELL_DESCRIPTOR}
              user={user}
              onOpenNavigation={() => setSidebarOpen(true)}
            />
            <div className="space-y-4 pb-10 pt-6">
              <CapPitchBanner />
              <main id="main-content" className="space-y-5">
                <Suspense fallback={<RouteFallback />}>
                  <PageTransition>
                    <Outlet />
                  </PageTransition>
                </Suspense>
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

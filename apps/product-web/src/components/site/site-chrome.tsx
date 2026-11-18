'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { Menu, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { externalLinks, footerNavigation, navigation, startFreeCta } from '@/lib/site-content';

import { MagneticLink } from './magnetic-link';

const footerColumnTitles: Record<string, string> = {
  platform: 'Platform',
  resources: 'Resources',
  company: 'Company',
};

/**
 * Site chrome (nav + footer).
 *
 * Slimmed per TECH-45: no `useScroll`-driven nav scale, no back-to-top motion
 * (scroll-triggered framer-motion removed); the nav holds the site's single
 * primary CTA ("Start free" → /launch); the footer "Contact Sales" button is
 * now a plain "Contact" text link; dead footer columns are gone.
 */
export function SiteChrome({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let frame = 0;
    const onMove = (event: MouseEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--spotlight-x', `${event.clientX}px`);
        document.documentElement.style.setProperty('--spotlight-y', `${event.clientY}px`);
      });
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  // Close mobile menu on Escape key
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const currentYear = new Date().getFullYear();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-[#d7dfdc] bg-[#fbfcfb]/95 backdrop-blur-sm">
        <div className="section-shell flex min-h-[64px] items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-3 no-underline">
              <span className="relative inline-grid h-8 w-8 place-items-center bg-[#153f3a] font-display text-xs font-bold text-white sm:h-9 sm:w-9">
              FP
              <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 border-2 border-[#fbfcfb] bg-[#d5a83e]" aria-hidden="true" />
            </span>
            <span className="hidden sm:grid">
              <strong className="font-display text-sm font-semibold text-[#172a24]">FreightPilot</strong>
              <span className="text-[11px] text-[#63766f]">Logistics operations workspace</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {navigation.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative inline-flex min-h-9 items-center px-3 text-sm text-[#52665e] transition hover:bg-[#eef3f0] hover:text-[#172a24]',
                    active && 'font-semibold text-[#087f72]',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <MagneticLink href={externalLinks.docs} variant="ghost" showIcon={false}>
              Docs
            </MagneticLink>
            <MagneticLink href="/launch" variant="primary">
              {startFreeCta}
            </MagneticLink>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center border border-[#cfd9d5] bg-white text-[#40534c] lg:hidden"
            aria-expanded={menuOpen}
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen ? (
          <>
            {/* Backdrop overlay for mobile menu */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-20 bg-[#20372f]/30 lg:hidden"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <m.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-3 top-[72px] z-30 border border-[#d7dfdc] bg-white p-4 shadow-xl sm:inset-x-6 sm:top-[76px] lg:hidden"
            >
              <div className="grid gap-3">
                {navigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'border border-[#d7dfdc] px-4 py-3 text-[#40534c] transition hover:bg-[#f4f8f6]',
                      pathname === item.href && 'border-[#087f72] bg-[#eef7f3] text-[#172a24]',
                    )}
                  >
                    <span className="block text-sm font-semibold text-[#172a24]">{item.label}</span>
                    <span className="mt-0.5 block text-xs text-[#63766f]">{item.description}</span>
                  </Link>
                ))}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MagneticLink href={externalLinks.docs} variant="secondary">
                  Open docs
                </MagneticLink>
                <MagneticLink href={externalLinks.console} variant="secondary" external>
                  Open console
                </MagneticLink>
              </div>
            </m.div>
          </>
        ) : null}
      </AnimatePresence>

      <main id="main-content" className="relative z-10 pb-20 pt-4 sm:pb-24 sm:pt-6 lg:pt-8">{children}</main>

      <footer className="relative z-10 mt-12 border-t border-[#d7dfdc] bg-[#fbfcfb] px-3 pb-10 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <div className="section-shell grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)] lg:gap-8">
          <div className="max-w-md space-y-6">
            <Link href="/" className="inline-flex items-center gap-3 no-underline">
            <span className="inline-grid h-8 w-8 place-items-center bg-[#153f3a] font-display text-xs font-bold text-white sm:h-9 sm:w-9">
                FP
              </span>
              <span className="grid">
                <strong className="font-display text-sm font-semibold text-[#172a24]">FreightPilot</strong>
                <span className="text-[11px] text-[#63766f]">Logistics operations workspace</span>
              </span>
            </Link>
            <p className="text-sm leading-7 text-[#5b6d66]">
              Built to give operators one place to plan routes, handle exceptions, manage provider controls, and launch new workspaces securely and reliably.
            </p>
            <div className="flex gap-4 pt-2">
              <Link href="/contact" className="text-sm font-medium text-[#40534c] underline-offset-4 transition hover:text-[#087f72] hover:underline">
                Contact
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {Object.entries(footerNavigation).map(([key, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={key} className="space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#172a24]">{footerColumnTitles[key] ?? key}</h4>
                  <ul className="space-y-3">
                    {items.map((item) => (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          className="text-sm text-[#5b6d66] transition hover:text-[#087f72]"
                          {...(item.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legal footer row */}
        <div className="section-shell mt-10 flex flex-col items-center justify-between gap-4 border-t border-[#d7dfdc] pt-6 text-xs text-[#63766f] sm:flex-row">
          <p>© {currentYear} FreightPilot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

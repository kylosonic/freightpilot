'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { PropsWithChildren } from 'react';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { externalLinks, footerNavigation, navigation, startFreeCta } from '@/lib/site-content';

import { MagneticLink } from './magnetic-link';

const footerColumnTitles: Record<string, string> = {
  platform: 'Platform',
  resources: 'Resources',
  company: 'Company',
};

function normalizePath(pathname: string | null | undefined): string {
  if (!pathname || pathname === '/') return '/';
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
}

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
  const activePath = normalizePath(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => setMenuOpen(false), [pathname]);

  // Close mobile menu on Escape key and restore focus to the toggle button
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
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
      <header className="sticky top-0 z-40 border-b border-[#e5e4e0] bg-white/95 backdrop-blur-md">
        <div className="section-shell flex min-h-[60px] items-center justify-between gap-3">
          <Link href="/" prefetch={false} className="inline-flex items-center gap-2.5 rounded-md no-underline">
            <span className="inline-grid h-7 w-7 place-items-center rounded-md bg-[#2e4f47] font-display text-[11px] font-semibold text-white">
              FP
            </span>
            <strong className="font-display text-[14px] font-semibold text-[#252522]">FreightPilot</strong>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {navigation.map((item) => {
              const active = activePath === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={cn(
                    'relative inline-flex min-h-8 items-center rounded-md px-3 text-[13px] text-[#5f5f59] transition hover:bg-[#f4f4f1] hover:text-[#252522]',
                    active && 'bg-[#f4f4f1] font-medium text-[#252522]',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <MagneticLink
              href={externalLinks.docs}
              variant="ghost"
              showIcon={false}
              className={activePath === '/docs' ? 'bg-[#f4f4f1] text-[#252522]' : undefined}
            >
              Docs
            </MagneticLink>
            <MagneticLink href={externalLinks.console} variant="ghost" showIcon={false}>
              Sign in
            </MagneticLink>
            <MagneticLink href="/launch" variant="primary">
              {startFreeCta}
            </MagneticLink>
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[#454540] transition hover:bg-[#f4f4f1] lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
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
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              className="fixed inset-0 z-20 bg-[#252522]/30 lg:hidden"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <m.nav
              id="mobile-navigation"
              aria-label="Mobile navigation"
              initial={reduceMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-3 top-[68px] z-30 rounded-lg border border-[#e5e4e0] bg-white p-3 shadow-xl sm:inset-x-6 lg:hidden"
            >
              <div className="grid gap-1.5">
                {navigation.map((item) => {
                  const active = activePath === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'rounded-md px-3 py-2.5 text-[#5f5f59] transition hover:bg-[#f7f7f5]',
                        active && 'bg-[#f4f4f1] text-[#252522]',
                      )}
                    >
                      <span className="block text-sm font-semibold text-[#252522]">{item.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-5 text-[#5f5f59]">{item.description}</span>
                    </Link>
                  );
                })}
              </div>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                <MagneticLink href={externalLinks.docs} variant="secondary">
                  Docs
                </MagneticLink>
                <MagneticLink href={externalLinks.console} variant="secondary" external>
                  Sign in
                </MagneticLink>
                <MagneticLink href="/launch" variant="primary">
                  {startFreeCta}
                </MagneticLink>
              </div>
            </m.nav>
          </>
        ) : null}
      </AnimatePresence>

      <main id="main-content" className="relative z-10 pb-20">{children}</main>

      <footer className="relative z-10 mt-16 bg-[#f7f7f5] pb-10 pt-10 sm:pt-14">
        <div className="section-shell grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)] lg:gap-8">
          <div className="max-w-md space-y-6">
            <Link href="/" className="inline-flex items-center gap-3 rounded-md no-underline">
              <span className="inline-grid h-8 w-8 place-items-center rounded-md bg-[#2e4f47] font-display text-xs font-semibold text-white">
                FP
              </span>
              <span className="grid">
                <strong className="font-display text-sm font-semibold text-[#252522]">FreightPilot</strong>
                <span className="text-[11px] text-[#5f5f59]">Logistics operations workspace</span>
              </span>
            </Link>
            <p className="text-sm leading-7 text-[#5f5f59]">
              One place to plan routes, follow deliveries, fix problems, and manage your team.
            </p>
            <div className="flex gap-4 pt-2">
              <Link href="/contact" className="text-sm font-medium text-[#454540] underline-offset-4 transition hover:text-[#176b5c] hover:underline">
                Contact
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {Object.entries(footerNavigation).map(([key, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={key} className="space-y-4">
                  <p className="text-[13px] font-medium text-[#252522]">{footerColumnTitles[key] ?? key}</p>
                  <ul className="space-y-3">
                    {items.map((item) => (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          className="text-sm text-[#5f5f59] transition hover:text-[#176b5c]"
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
        <div className="section-shell mt-10 flex flex-col items-center justify-between gap-4 border-t border-[#e5e4e0] pt-6 text-xs text-[#5f5f59] sm:flex-row">
          <p>© {currentYear} FreightPilot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

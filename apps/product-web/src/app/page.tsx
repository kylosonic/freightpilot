import { HeroEntrance } from '@/components/site/hero-entrance';
import { HowItWorks } from '@/components/site/how-it-works';
import { MagneticLink } from '@/components/site/magnetic-link';
import { PricingSummary } from '@/components/site/pricing-summary';
import { WorkspacePreview } from '@/components/site/workspace-preview';
import {
  heroHeadline,
  heroParagraph,
  startFreeCta,
  trustStripLine,
} from '@/lib/site-content';
import { ArrowRight, BellRing, MapPin, PackageCheck } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <section className="section-shell pt-8 sm:pt-12 lg:pt-14" data-section="hero">
        <div className="grid gap-8 border-b border-[#d7dfdc] pb-10 sm:gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-12 lg:pb-14">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 border border-[#b9dcd1] bg-[#edf8f3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#14745f]">
                <span className="h-1.5 w-1.5 bg-[#16856b]" aria-hidden="true" />
                Freight operations workspace
              </span>
              <span className="text-[11px] text-[#63766f]">Addis Ababa</span>
            </div>
            <HeroEntrance />
            <p className="lede max-w-[540px] text-base sm:text-[17px]">{heroParagraph}</p>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <MagneticLink href="/launch" variant="primary" className="min-h-12 px-6">
                {startFreeCta}
              </MagneticLink>
              <Link href="/platform" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#40534c] underline-offset-4 hover:text-[#087f72] hover:underline">
                Explore the platform
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid max-w-[560px] grid-cols-1 divide-y divide-[#d7dfdc] border-t border-[#d7dfdc] pt-2 min-[420px]:grid-cols-3 min-[420px]:divide-x min-[420px]:divide-y-0 min-[420px]:pt-4">
              {[
                { Icon: MapPin, label: 'Route plans' },
                { Icon: BellRing, label: 'Exception triage' },
                { Icon: PackageCheck, label: 'Cash close' },
              ].map(({ Icon, label }) => (
                <div key={label} className="flex items-center gap-2 py-2 min-[420px]:px-3 min-[420px]:py-0 min-[420px]:first:pl-0 min-[420px]:last:pr-0">
                  <Icon className="h-4 w-4 shrink-0 text-[#087f72]" aria-hidden="true" />
                  <span className="text-[11px] font-medium text-[#52665e]">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="min-w-0 lg:pl-2">
            <WorkspacePreview />
            <p className="mt-2 text-right text-[10px] text-[#63766f]">
              Example workspace · sample data
            </p>
          </div>
        </div>
      </section>

      <HowItWorks />

      <PricingSummary />

      <section className="section-shell pt-14 sm:pt-18" data-section="trust-strip">
        <p className="mx-auto max-w-[34rem] text-balance text-center text-sm leading-6 text-[#52665e] sm:text-base">
          {trustStripLine}
        </p>
      </section>

      <section className="section-shell pb-8 pt-14 sm:pb-12 sm:pt-18" data-section="final-cta">
        <div className="flex justify-center">
          <MagneticLink href="/launch" variant="primary" className="min-h-16 px-10 text-lg">
            {startFreeCta}
          </MagneticLink>
        </div>
      </section>
    </>
  );
}

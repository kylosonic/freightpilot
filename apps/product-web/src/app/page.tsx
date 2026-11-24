import { HeroEntrance } from '@/components/site/hero-entrance';
import { HowItWorks } from '@/components/site/how-it-works';
import { MagneticLink } from '@/components/site/magnetic-link';
import { PricingSummary } from '@/components/site/pricing-summary';
import { WorkspacePreview } from '@/components/site/workspace-preview';
import {
  heroParagraph,
  startFreeCta,
  trustStripLine,
} from '@/lib/site-content';

export default function HomePage() {
  return (
    <>
      <section className="section-shell pb-10 pt-14 sm:pb-16 sm:pt-20" data-section="hero">
        <div className="flex min-w-0 flex-col items-center">
          <div className="mb-6 flex items-center gap-2 rounded-full border border-[#e5e4e0] bg-[#f7f7f5] px-3 py-1.5 text-[12px] text-[#5f5f59]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16856b]" aria-hidden="true" />
            Freight operations workspace
          </div>
          <div className="w-full min-w-0 text-center">
            <HeroEntrance />
          </div>
          <p className="lede mx-auto mt-5 max-w-[640px] text-center text-[16px] leading-7 sm:text-[17px]">{heroParagraph}</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            <MagneticLink href="/launch" variant="primary" className="min-h-11 px-5">
              {startFreeCta}
            </MagneticLink>
            <a href="#how-it-works" className="site-action-secondary min-h-11 px-4">
              See how it works
            </a>
          </div>
          <p className="mt-3 text-center text-[12px] text-[#73736e]">Sample workspace included. No card required.</p>
        </div>
        <div className="mx-auto mt-10 min-w-0 max-w-[1020px] sm:mt-12">
          <WorkspacePreview />
          <p className="mt-2 text-right text-[11px] text-[#73736e]">
            Example workspace · sample data
          </p>
        </div>
      </section>

      <HowItWorks />

      <PricingSummary />

      <section className="section-shell pt-16 sm:pt-20" data-section="trust-strip">
        <p className="mx-auto max-w-[34rem] text-balance text-center text-sm leading-6 text-[#5f5f59] sm:text-base">
          {trustStripLine}
        </p>
      </section>

      <section className="section-shell pb-8 pt-16 sm:pb-12 sm:pt-20" data-section="final-cta">
        <div className="mx-auto flex max-w-[800px] flex-col items-center gap-5 rounded-xl bg-[#f7f7f5] px-6 py-10 text-center sm:py-12">
          <h2 className="site-heading max-w-[22ch]">Make your next delivery day easier.</h2>
          <MagneticLink href="/launch" variant="primary" className="min-h-11 px-5">
            {startFreeCta}
          </MagneticLink>
        </div>
      </section>
    </>
  );
}

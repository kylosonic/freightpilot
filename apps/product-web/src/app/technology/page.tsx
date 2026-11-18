import type { Metadata } from 'next';
import { ArrowRight, BrainCircuit, Cable, Cpu, Fingerprint, Radar, ShieldCheck } from 'lucide-react';

import { MagneticLink } from '@/components/site/magnetic-link';
import { MotionSection } from '@/components/site/motion-section';
import { PageHero } from '@/components/site/page-hero';
import { SectionHeading } from '@/components/site/section-heading';
import { SpotlightCard } from '@/components/site/spotlight-card';
import { codeSnippet, startFreeCta, technologyLayers, trustRibbon } from '@/lib/site-content';

export const metadata: Metadata = {
  title: 'Technology',
  description:
    'Learn how FreightPilot uses AI, keeps your team in control, and records important changes.',
};

export default function TechnologyPage() {
  return (
    <>
      <PageHero
        eyebrow="Technology"
        title="AI that helps, while your team stays in control"
        description="You choose who provides AI, what data is used, and when a suggestion becomes a real decision."
        actions={
          <MagneticLink href="/launch" variant="primary">
            {startFreeCta}
          </MagneticLink>
        }
        aside={
          <SpotlightCard>
            <BrainCircuit className="h-5 w-5 text-[#087f72]" />
            <h3 className="mt-3 text-base font-semibold text-[#172a24]">Model choice stays in your hands</h3>
            <p className="mt-2 text-sm leading-6 text-[#5b6d66]">You can connect your own AI provider and change it at any time.</p>
          </SpotlightCard>
        }
      />

      <MotionSection className="section-shell pt-12 sm:pt-16" delay={0.06}>
        <SectionHeading
          eyebrow="How it works"
          title="Clear information behind every suggestion"
          description="FreightPilot combines your delivery data, your choices, and a record of changes."
        />
        <div className="mt-8 grid grid-cols-1 divide-y divide-[#e5e4e0] border-y border-[#e5e4e0] md:grid-cols-2 md:divide-y-0">
          {technologyLayers.map((layer) => (
            <article key={layer.title} className="min-w-0 py-6 md:px-6 md:first:pl-0">
              <layer.icon className="h-5 w-5 text-[#087f72]" />
              <h3 className="mt-3 text-base font-medium text-[#252522]">{layer.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#73736e]">{layer.description}</p>
              <p className="mt-3 border-t border-[#efeeea] pt-3 text-[12px] leading-5 text-[#85857e]">{layer.detail}</p>
            </article>
          ))}
        </div>
      </MotionSection>

      <MotionSection className="section-shell pt-12 sm:pt-16" delay={0.06}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-12">
          <div>
            <p className="kicker">How decisions work</p>
            <h3 className="mt-2 text-xl font-medium text-[#252522]">Notice, decide, act, and review.</h3>
            <div className="mt-6 border-t border-[#e5e4e0]">
              {[
                { icon: Radar, title: 'Notice', detail: 'Find late deliveries, low stock, and other issues that need attention.', color: 'text-[#087f72]' },
                { icon: Cpu, title: 'Decide', detail: 'Compare route options and costs before you choose.', color: 'text-[#087f72]' },
                { icon: Cable, title: 'Act', detail: 'Assign the route and update deliveries from one place.', color: 'text-[#087f72]' },
                { icon: Fingerprint, title: 'Review', detail: 'See who changed a route, setting, or payment.', color: 'text-[#087f72]' },
              ].map((item) => (
                <div key={item.title} className="border-b border-[#e5e4e0] py-3">
                  <div className="flex items-center gap-3">
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                    <h4 className="text-sm font-medium text-[#252522]">{item.title}</h4>
                  </div>
                  <p className="mt-1.5 text-sm leading-6 text-[#73736e]">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="kicker">Route API</p>
                <h3 className="mt-2 text-xl font-medium text-[#252522]">Every route plan shows why it was chosen</h3>
              </div>
              <div className="pill">
                <ShieldCheck className="h-4 w-4" />
                workspace only
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-lg bg-[#f7f7f5]">
              <div className="flex items-center justify-between gap-3 px-4 py-3 text-[11px] text-[#73736e]">
                <span>POST /routes/optimize</span>
                <span className="inline-flex items-center gap-2">
                  plan a route <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <pre className="overflow-x-auto border-t border-[#e5e4e0] bg-white px-4 py-4 text-xs leading-6 text-[#25483f]">
                <code>{codeSnippet}</code>
              </pre>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {trustRibbon.map((item) => (
                <span key={item} className="rounded-full bg-[#f5f5f2] px-2.5 py-1.5 text-[11px] text-[#5f5f59]">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </MotionSection>
    </>
  );
}

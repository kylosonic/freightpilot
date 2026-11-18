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
    'Learn how FreightPilot handles AI provider controls, signal processing, governance, and decision support with full audit history and workspace policy visibility.',
};

export default function TechnologyPage() {
  return (
    <>
      <PageHero
        eyebrow="Technology"
        title="AI assistance with visible controls and audit history"
        description="FreightPilot treats signal handling, model routing, workspace policy, and auditability as operational controls that need to stay visible to the team."
        actions={
          <MagneticLink href="/launch" variant="primary">
            {startFreeCta}
          </MagneticLink>
        }
        aside={
          <SpotlightCard>
            <BrainCircuit className="h-5 w-5 text-[#087f72]" />
            <h3 className="mt-3 text-base font-semibold text-[#172a24]">Model choice stays in your hands</h3>
            <p className="mt-2 text-sm leading-6 text-[#5b6d66]">Bring-your-own provider keys and preferred workspace providers are visible controls, not hidden settings.</p>
          </SpotlightCard>
        }
      />

      <MotionSection className="section-shell pt-12 sm:pt-16" delay={0.06}>
        <SectionHeading
          eyebrow="Technology layers"
          title="The stack should explain how decisions are supported"
          description="The technology model is organized around live signal, provider control, governance, and rollout support instead of generic AI language."
        />
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {technologyLayers.map((layer) => (
            <SpotlightCard key={layer.title}>
              <layer.icon className="h-5 w-5 text-[#087f72]" />
              <h3 className="mt-3 text-base font-semibold text-[#172a24]">{layer.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5b6d66]">{layer.description}</p>
              <p className="mt-3 border-t border-[#e2e8e5] pt-3 text-xs leading-5 text-[#63766f]">{layer.detail}</p>
            </SpotlightCard>
          ))}
        </div>
      </MotionSection>

      <MotionSection className="section-shell pt-12 sm:pt-16" delay={0.06}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <SpotlightCard className="min-h-[380px]">
            <p className="kicker">Intelligence pattern</p>
            <h3 className="mt-2 text-xl font-semibold text-[#172a24]">Detect. Decide. Act. Govern.</h3>
            <div className="mt-6 border-t border-[#e2e8e5]">
              {[
                { icon: Radar, title: 'Detect', detail: 'Route drift, inventory pressure, and workspace risk enter the same command narrative.', color: 'text-[#087f72]' },
                { icon: Cpu, title: 'Decide', detail: 'Route choices, costs, and launch readiness stay in view while the operator acts.', color: 'text-[#087f72]' },
                { icon: Cable, title: 'Act', detail: 'Shipments, alerts, and desktop flows stay operationally linked instead of conceptually linked.', color: 'text-[#087f72]' },
                { icon: Fingerprint, title: 'Govern', detail: 'Audit events, provider changes, and commercial posture remain reviewable.', color: 'text-[#087f72]' },
              ].map((item) => (
                <div key={item.title} className="border-b border-[#e2e8e5] py-3">
                  <div className="flex items-center gap-3">
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                    <h4 className="text-sm font-semibold text-[#172a24]">{item.title}</h4>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-[#5b6d66]">{item.detail}</p>
                </div>
              ))}
            </div>
          </SpotlightCard>

          <div className="border border-[#d7dfdc] bg-white px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="kicker">Route API</p>
                <h3 className="mt-2 text-xl font-semibold text-[#172a24]">A decision call returns evidence, not just a path</h3>
              </div>
              <div className="pill">
                <ShieldCheck className="h-4 w-4" />
                workspace scoped
              </div>
            </div>

            <div className="mt-6 overflow-hidden border border-[#d7dfdc] bg-[#f8faf9]">
              <div className="flex items-center justify-between border-b border-[#d7dfdc] px-3 py-2 text-[10px] uppercase tracking-[0.08em] text-[#63766f]">
                <span>POST /routes/optimize</span>
                <span className="inline-flex items-center gap-2">
                  route decision <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <pre className="overflow-x-auto px-3 py-4 text-xs leading-6 text-[#25483f]">
                <code>{codeSnippet}</code>
              </pre>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {trustRibbon.map((item) => (
                <span key={item} className="border border-[#d7dfdc] bg-[#f8faf9] px-2.5 py-1.5 text-[10px] text-[#52665e]">
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

import type { Metadata } from 'next';
import { BadgeCheck, Gauge, Layers3, Route, Workflow } from 'lucide-react';

import { MagneticLink } from '@/components/site/magnetic-link';
import { MotionSection } from '@/components/site/motion-section';
import { PageHero } from '@/components/site/page-hero';
import { SectionHeading } from '@/components/site/section-heading';
import { SpotlightCard } from '@/components/site/spotlight-card';
import { operatingLoop, platformStacks, startFreeCta } from '@/lib/site-content';

export const metadata: Metadata = {
  title: 'Platform',
  description:
    'Explore how FreightPilot organizes route decisions, live exceptions, shipment flow, workspace controls, and rollout tasks into one operating system for logistics teams.',
};

export default function PlatformPage() {
  return (
    <>
      <PageHero
        eyebrow="Platform"
        title="A platform organized around real logistics work"
        description="FreightPilot brings route decisions, live exceptions, shipment flow, workspace controls, and rollout tasks into one operating system."
        actions={
          <MagneticLink href="/launch" variant="primary">
            {startFreeCta}
          </MagneticLink>
        }
        aside={
          <div className="grid gap-4">
            <SpotlightCard>
              <Layers3 className="h-5 w-5 text-[#087f72]" />
              <p className="mt-3 text-base font-semibold text-[#172a24]">Four product families. One operating rhythm.</p>
              <p className="mt-2 text-sm leading-6 text-[#5b6d66]">Control Tower, Decision Studio, Launch Workstation, and Revenue Guard are presented as one ecosystem instead of fragmented modules.</p>
            </SpotlightCard>
          </div>
        }
      />

      <MotionSection className="section-shell pt-12 sm:pt-16" delay={0.06}>
        <SectionHeading
          eyebrow="Product stack"
          title="Each part of the product supports the same operating workflow"
          description="The platform is modular, but teams should still experience it as one connected system for planning, response, and rollout."
        />
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {platformStacks.map((feature) => (
            <SpotlightCard key={feature.title}>
              <feature.icon className="h-5 w-5 text-[#087f72]" />
              <h3 className="mt-3 text-base font-semibold text-[#172a24]">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5b6d66]">{feature.description}</p>
              <p className="mt-3 border-t border-[#e2e8e5] pt-3 text-xs leading-5 text-[#63766f]">{feature.detail}</p>
            </SpotlightCard>
          ))}
        </div>
      </MotionSection>

      <MotionSection className="section-shell pt-12 sm:pt-16" delay={0.06}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="border border-[#d7dfdc] bg-white px-5 py-6 sm:px-6">
            <SectionHeading
              eyebrow="How it works"
              title="Route decisions stay readable while pressure is high"
              description="Every stage of the workflow keeps the next action visible without forcing the team to leave the current operating context."
            />
            <div className="mt-7 border-t border-[#e2e8e5]">
              {operatingLoop.map((item) => (
                <div key={item.title} className="border-b border-[#e2e8e5] py-4">
                  <span className="kicker">{item.label}</span>
                  <h3 className="mt-1.5 text-base font-semibold text-[#172a24]">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-[#5b6d66]">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <SpotlightCard>
              <Route className="h-5 w-5 text-[#087f72]" />
              <h3 className="mt-3 text-base font-semibold text-[#172a24]">Route Studio</h3>
              <p className="mt-2 text-sm leading-6 text-[#5b6d66]">Optimize, compare, and persist route scenarios with unassigned demand history visible after the run.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {['Scenario history', 'Map review', 'Saved schedules', 'Operator handoff'].map((item) => (
                  <div key={item} className="border border-[#d7dfdc] bg-[#f8faf9] px-3 py-2 text-xs text-[#52665e]">
                    {item}
                  </div>
                ))}
              </div>
            </SpotlightCard>
            <SpotlightCard>
              <Gauge className="h-5 w-5 text-[#087f72]" />
              <h3 className="mt-3 text-base font-semibold text-[#172a24]">Workspace commercial posture</h3>
              <p className="mt-2 text-sm leading-6 text-[#5b6d66]">Usage metering, provider preference, and subscription posture belong in the same operating story as dispatch and routing.</p>
            </SpotlightCard>
          </div>
        </div>
      </MotionSection>

      <MotionSection className="section-shell py-12 sm:py-16" delay={0.06}>
        <SectionHeading
          eyebrow="Platform outcome"
          title="The product experience should stay coherent from website to workstation"
          description="FreightPilot is designed so the marketing site, operator console, and launch workstation all explain the same operating model."
          align="center"
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { icon: Workflow, title: 'Operational coherence', detail: 'Routes, alerts, and launch state tell one story.', color: 'text-[#087f72]' },
            { icon: Layers3, title: 'Consistent interaction design', detail: 'Dense tables, clear states, and stable navigation support repeated work.', color: 'text-[#087f72]' },
            { icon: BadgeCheck, title: 'Credible trust posture', detail: 'Audit trails and workspace governance keep every claim anchored in the product.', color: 'text-[#087f72]' },
          ].map((item) => (
            <SpotlightCard key={item.title}>
              <item.icon className={`h-5 w-5 ${item.color}`} />
              <h3 className="mt-3 text-base font-semibold text-[#172a24]">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5b6d66]">{item.detail}</p>
            </SpotlightCard>
          ))}
        </div>
      </MotionSection>
    </>
  );
}

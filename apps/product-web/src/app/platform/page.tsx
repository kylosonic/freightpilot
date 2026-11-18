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
    'Plan routes, follow deliveries, handle problems, and manage your team in one place.',
};

export default function PlatformPage() {
  return (
    <>
      <PageHero
        eyebrow="Platform"
        title="Everything you need to run deliveries"
        description="Plan routes, follow shipments, handle problems, and manage your team in one place."
        actions={
          <MagneticLink href="/launch" variant="primary">
            {startFreeCta}
          </MagneticLink>
        }
        aside={
          <div className="grid gap-4">
            <SpotlightCard>
              <Layers3 className="h-5 w-5 text-[#087f72]" />
              <p className="mt-3 text-base font-semibold text-[#172a24]">One system for the whole delivery day.</p>
              <p className="mt-2 text-sm leading-6 text-[#5b6d66]">Plan, dispatch, track, and check payments without moving between separate tools.</p>
            </SpotlightCard>
          </div>
        }
      />

      <MotionSection className="section-shell pt-12 sm:pt-16" delay={0.06}>
        <SectionHeading
          eyebrow="What it does"
          title="Everything works together"
          description="Each part does a clear job, and your team uses the same data across the whole day."
        />
        <div className="mt-8 grid grid-cols-1 divide-y divide-[#e5e4e0] border-y border-[#e5e4e0] md:grid-cols-2 md:divide-y-0">
          {platformStacks.map((feature) => (
            <article key={feature.title} className="min-w-0 py-6 md:px-6 md:first:pl-0">
              <feature.icon className="h-5 w-5 text-[#087f72]" />
              <h3 className="mt-3 text-base font-medium text-[#252522]">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#73736e]">{feature.description}</p>
              <p className="mt-3 border-t border-[#efeeea] pt-3 text-[12px] leading-5 text-[#85857e]">{feature.detail}</p>
            </article>
          ))}
        </div>
      </MotionSection>

      <MotionSection className="section-shell pt-12 sm:pt-16" delay={0.06}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
          <div>
            <SectionHeading
              eyebrow="How it works"
              title="Find the next problem before it grows"
              description="See what needs attention and take the next step without searching through different screens."
            />
            <div className="mt-7 border-t border-[#e5e4e0]">
              {operatingLoop.map((item) => (
                <div key={item.title} className="border-b border-[#e5e4e0] py-4">
                  <span className="kicker">{item.label}</span>
                  <h3 className="mt-1.5 text-base font-medium text-[#252522]">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-[#73736e]">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-lg bg-[#f7f7f5] p-5 sm:p-6">
              <Route className="h-5 w-5 text-[#087f72]" />
              <h3 className="mt-3 text-base font-medium text-[#252522]">Route Studio</h3>
              <p className="mt-2 text-sm leading-6 text-[#73736e]">Plan a route, compare it with your last plan, and save it for your drivers.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {['Scenario history', 'Map review', 'Saved schedules', 'Operator handoff'].map((item) => (
                  <div key={item} className="rounded-md bg-white px-3 py-2 text-xs text-[#5f5f59]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg bg-[#f7f7f5] p-5 sm:p-6">
              <Gauge className="h-5 w-5 text-[#087f72]" />
              <h3 className="mt-3 text-base font-medium text-[#252522]">Plan and usage</h3>
              <p className="mt-2 text-sm leading-6 text-[#73736e]">See how much of your plan you have used and when your team needs to upgrade.</p>
            </div>
          </div>
        </div>
      </MotionSection>

      <MotionSection className="section-shell py-12 sm:py-16" delay={0.06}>
        <SectionHeading
          eyebrow="Why it helps"
          title="A simpler way to run the day"
          description="Your team gets clear information, simple next steps, and a record of what changed."
          align="center"
        />
        <div className="mt-8 grid gap-6 rounded-xl bg-[#f7f7f5] p-5 sm:p-8 md:grid-cols-3">
          {[
            { icon: Workflow, title: 'One clear view', detail: 'Routes, issues, and setup progress are easy to follow.', color: 'text-[#087f72]' },
            { icon: Layers3, title: 'Easy to learn', detail: 'Simple labels and familiar controls make daily work faster.', color: 'text-[#087f72]' },
            { icon: BadgeCheck, title: 'Clear records', detail: 'See who changed what and when it happened.', color: 'text-[#087f72]' },
          ].map((item) => (
            <article key={item.title}>
              <item.icon className={`h-5 w-5 ${item.color}`} />
              <h3 className="mt-3 text-base font-medium text-[#252522]">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#73736e]">{item.detail}</p>
            </article>
          ))}
        </div>
      </MotionSection>
    </>
  );
}

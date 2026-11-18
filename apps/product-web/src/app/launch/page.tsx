import type { Metadata } from 'next';

import { PageHero } from '@/components/site/page-hero';
import { SectionHeading } from '@/components/site/section-heading';
import { SignupForm } from '@/components/site/signup-form';
import { afterSignupSteps } from '@/lib/site-content';

export const metadata: Metadata = {
  title: 'Launch',
  description:
    'Sign up and your workspace loads with sample data. Run your first route optimization in minutes — no card required.',
};

export default function LaunchPage() {
  return (
    <>
      <PageHero
        eyebrow="Launch"
        title="Start your workspace with sample data"
        description="Sign up and your workspace loads with sample data — warehouses, fleet, inventory, orders, all ready. Optimize your first route immediately. No card required."
      />

      <section className="section-shell pt-10 sm:pt-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-12">
          <SignupForm />

          <div className="pt-1 pl-0 lg:pl-8">
            <SectionHeading
              eyebrow="After signup"
              title="What happens next"
              description="Three steps from signup to your first optimized route."
            />
            <div className="mt-8 space-y-4">
              {afterSignupSteps.map((step) => (
                <div key={step.title} className="border-t border-[#efeeea] py-4 first:border-t-0 first:pt-0">
                  <span className="kicker">{step.label}</span>
                  <h3 className="mt-1.5 text-base font-medium text-[#252522]">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-[#73736e]">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

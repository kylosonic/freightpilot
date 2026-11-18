import type { Metadata } from 'next';

import { PageHero } from '@/components/site/page-hero';
import { SpotlightCard } from '@/components/site/spotlight-card';

import { StatusProbe } from './StatusProbe';

export const metadata: Metadata = {
  title: 'Status',
  description: 'Current FreightPilot platform health and service limits.',
};

export default function StatusPage() {
  return (
    <>
      <PageHero
        eyebrow="Status"
        title="Know what is up, and what is not promised"
        description="The health endpoint checks the API process and database connection. Route optimization, receipt verification, and external AI providers can still be unavailable independently."
      />

      <section className="section-shell py-10 sm:py-14">
        <StatusProbe />
      </section>

      <section className="section-shell pb-16">
        <div className="grid gap-4 lg:grid-cols-2">
          <SpotlightCard>
            <h2 className="text-lg font-semibold text-[#172a24]">What this page checks</h2>
            <p className="mt-3 text-sm leading-7 text-[#5b6d66]">
              A healthy result means the API answered and its database connection passed a simple
              readiness query. It does not prove that every route, background task, provider key,
              or browser flow is working.
            </p>
          </SpotlightCard>
          <SpotlightCard>
            <h2 className="text-lg font-semibold text-[#172a24]">Incident expectations</h2>
            <p className="mt-3 text-sm leading-7 text-[#5b6d66]">
              This public page is informational. Enterprise support and response targets require a
              signed agreement. For a personal data or security concern, use the contact page and do
              not post secrets or customer data publicly.
            </p>
          </SpotlightCard>
        </div>
      </section>
    </>
  );
}

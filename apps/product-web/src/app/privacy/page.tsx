import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHero } from '@/components/site/page-hero';
import { SpotlightCard } from '@/components/site/spotlight-card';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What data FreightPilot keeps, why it is used, and the choices workspace owners have.',
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Privacy"
        title="What data we keep and why"
        description="This page explains what FreightPilot stores, what it is used for, and what workspace owners can control. Your signed data-processing agreement still applies where one exists."
      />

      <section className="section-shell pt-10 sm:pt-14">
        <div className="grid gap-4 lg:grid-cols-2">
          <SpotlightCard>
            <h2 className="text-lg font-semibold text-[#252522]">What we keep</h2>
            <ul className="mt-3 space-y-2.5 text-sm leading-7 text-[#5f5f59]">
              <li>Account and workspace details: company name, business email, user name, role, and contact phone.</li>
              <li>Records you upload or create: warehouses, items, stock, orders, shipments, routes, drivers, customers, and stops.</li>
              <li>Delivery records: whether a delivery went through, the last known location, delivery photos, receiver confirmation, and cash collected.</li>
              <li>Payment records: subscription invoices, bank transfer receipts, payment checks, and change history.</li>
              <li>Technical records: request IDs, times, task counts, system health checks, and error details.</li>
            </ul>
          </SpotlightCard>
          <SpotlightCard>
            <h2 className="text-lg font-semibold text-[#252522]">Why we use it</h2>
            <ul className="mt-3 space-y-2.5 text-sm leading-7 text-[#5f5f59]">
              <li>To run the workspace and the features you use.</li>
              <li>To sign people in and make sure they only see their own workspace.</li>
              <li>To create route plans, demand estimates, issue alerts, and cash handover records.</li>
              <li>To stop abuse, fix errors, and keep the service secure.</li>
              <li>To count plan usage and check bank transfer receipts.</li>
            </ul>
          </SpotlightCard>
        </div>
      </section>

      <section className="section-shell pt-10 sm:pt-14">
        <SpotlightCard>
          <h2 className="text-lg font-semibold text-[#252522]">Where we keep it and how long</h2>
          <div className="mt-3 grid gap-5 text-sm leading-7 text-[#5f5f59] lg:grid-cols-2">
            <div className="space-y-3">
              <p>
                FreightPilot uses hosted services for the website, app, database, and logs.
                A workspace owner can connect an AI provider. We only send requests to that provider
                when the workspace uses an AI feature.
              </p>
              <p>
                Your records stay in the workspace until its owner asks to delete them or the
                documentation gives a shorter time. Backup copies may remain for a limited recovery
                period.
              </p>
            </div>
            <div className="space-y-3">
              <p>
                Delivery photos, bank transfer receipts, and cash records are private workspace data.
                We do not sell them or use them to train a shared public model. If a workspace chooses
                an outside AI provider, that provider handles the request under its own terms.
              </p>
              <p>
                To request access, correction, export, or deletion, contact the workspace owner or
                use the{' '}
                <Link href="/contact" className="font-medium text-[#176b5c] underline underline-offset-4">
                  contact page
                </Link>
                . We may need to verify the request before acting.
              </p>
            </div>
          </div>
        </SpotlightCard>
      </section>

      <section className="section-shell pt-10 sm:pt-14">
        <SpotlightCard>
          <h2 className="text-lg font-semibold text-[#252522]">Your choices and rights</h2>
          <p className="mt-3 max-w-[60rem] text-sm leading-7 text-[#5f5f59]">
            Workspace owners control membership and provider configuration. Users should contact
            their workspace administrator for access or correction requests. We do not use
            third-party advertising trackers on the operator console. Privacy questions can be sent
            through the{' '}
            <Link href="/contact" className="font-medium text-[#176b5c] underline underline-offset-4">
              contact page
            </Link>
            ; we will route them to the appropriate workspace or service owner.
          </p>
        </SpotlightCard>
      </section>
    </>
  );
}

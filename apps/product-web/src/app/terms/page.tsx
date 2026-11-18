import type { Metadata } from 'next';

import { PageHero } from '@/components/site/page-hero';
import { SpotlightCard } from '@/components/site/spotlight-card';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'How you can use FreightPilot, what each side is responsible for, and how plans work.',
};

export default function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Terms"
        title="Terms for using FreightPilot"
        description="These are the basic rules for using FreightPilot. A paid or business agreement can add an order form, data terms, or service commitments."
      />

      <section className="section-shell py-10 sm:py-14">
        <div className="grid gap-4 lg:grid-cols-2">
          <SpotlightCard>
            <h2 className="text-lg font-semibold text-[#172a24]">Your responsibilities</h2>
            <ul className="mt-3 space-y-2.5 text-sm leading-7 text-[#5b6d66]">
              <li>You need permission to create or manage the company workspace.</li>
              <li>You are responsible for the data you import and the changes you approve.</li>
              <li>Keep sign-in details and provider keys safe. Remove a teammate's access when they leave.</li>
              <li>Do not use FreightPilot to break the law, harm others, spread malicious software, or access another company's workspace.</li>
              <li>Routes, demand estimates, cash warnings, and alerts are suggestions. An authorized person still makes the dispatch, payment, and customer decisions.</li>
            </ul>
          </SpotlightCard>
          <SpotlightCard>
            <h2 className="text-lg font-semibold text-[#172a24]">Plans and payments</h2>
            <ul className="mt-3 space-y-2.5 text-sm leading-7 text-[#5b6d66]">
              <li>The pricing page shows what each plan includes.</li>
              <li>A person reviews bank transfer receipts. Sending a receipt does not by itself mean the payment has cleared.</li>
              <li>We may lock a workspace for payment, security, or service problems. Where documented, you can still view your data.</li>
              <li>We may change plans, usage limits, and extra charges with notice. A signed business order takes priority over this page.</li>
              <li>If a feature is marked as an example, limited, or planned, it may not be ready for production use.</li>
            </ul>
          </SpotlightCard>
        </div>
      </section>

      <section className="section-shell pb-16">
        <SpotlightCard>
          <h2 className="text-lg font-semibold text-[#172a24]">Service availability and ending use</h2>
          <p className="mt-3 max-w-[62rem] text-sm leading-7 text-[#5b6d66]">
            We work to keep FreightPilot available and to recover it quickly after a problem, but
            this public page does not promise an enterprise uptime target. To the extent the law
            allows, FreightPilot is not responsible for indirect losses, lost profit, or decisions
            made without a person reviewing them. A workspace owner can stop using FreightPilot at
            any time. We may suspend a workspace for abuse, non-payment, or a security risk. Export
            any data you need before you stop. The privacy page explains deletion and backup copies.
          </p>
          <p className="mt-3 text-sm leading-7 text-[#5b6d66]">
            Questions about these terms can be sent through the contact page.
          </p>
        </SpotlightCard>
      </section>
    </>
  );
}

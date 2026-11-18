import type { Metadata } from 'next';

import { PageHero } from '@/components/site/page-hero';
import { SpotlightCard } from '@/components/site/spotlight-card';

export const metadata: Metadata = {
  title: 'Security',
  description: 'FreightPilot security controls, limitations, and vulnerability reporting.',
};

export default function SecurityPage() {
  return (
    <>
      <PageHero
        eyebrow="Security"
        title="How we protect your workspace"
        description="Here is what FreightPilot does to keep your data separate and your changes accounted for. We also list what we do not promise."
      />

      <section className="section-shell py-10 sm:py-14">
        <div className="grid gap-4 lg:grid-cols-2">
          <SpotlightCard>
            <h2 className="text-lg font-semibold text-[#172a24]">What we protect</h2>
            <ul className="mt-3 space-y-2.5 text-sm leading-7 text-[#5b6d66]">
              <li>People sign in before they can see or change workspace data. Each person's role limits what they can do.</li>
              <li>Each company has its own workspace. A request for another company's record is refused, and we do not reveal whether that record exists.</li>
              <li>Sign-in cookies cannot be read by page scripts and are only sent to FreightPilot. The console uses a short-lived access token that is cleared when someone switches accounts.</li>
              <li>AI provider keys are encrypted while stored. Keys are hidden in the console and can be removed.</li>
              <li>We keep a history of sensitive changes to routes, payments, settings, and AI providers.</li>
              <li>Our build process fixes dependency versions and checks them for known security problems.</li>
            </ul>
          </SpotlightCard>
          <SpotlightCard>
            <h2 className="text-lg font-semibold text-[#172a24]">What we do not promise</h2>
            <ul className="mt-3 space-y-2.5 text-sm leading-7 text-[#5b6d66]">
              <li>This page is not a claim that we hold SOC 2, ISO 27001, or PCI-DSS certification.</li>
              <li>FreightPilot does not hold customer money, act as an escrow service, or guarantee a carrier payment.</li>
              <li>Public pages only describe the service. Your signed agreement controls support and incident commitments.</li>
              <li>AI providers are optional. Your workspace owner controls the provider account and its terms.</li>
              <li>Before a high-risk deployment, you should get an independent security review and a review tailored to your business.</li>
            </ul>
          </SpotlightCard>
        </div>
      </section>

      <section className="section-shell pb-16">
        <SpotlightCard>
          <h2 className="text-lg font-semibold text-[#172a24]">Report a security problem</h2>
          <p className="mt-3 max-w-[60rem] text-sm leading-7 text-[#5b6d66]">
            Do not post passwords, keys, customer data, or personal details in a public issue.
            Use the contact page to tell us what went wrong, where you found it, and how to repeat it.
            Include only the information we need to check the report. We will confirm we received it
            and agree with you on when and how to share the details.
          </p>
        </SpotlightCard>
      </section>
    </>
  );
}

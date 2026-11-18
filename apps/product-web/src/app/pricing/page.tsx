import type { Metadata } from 'next';
import { BadgeCheck, CircleHelp } from 'lucide-react';

import { FaqAccordion } from '@/components/site/faq-accordion';
import { MagneticLink } from '@/components/site/magnetic-link';
import { PageHero } from '@/components/site/page-hero';
import { SectionHeading } from '@/components/site/section-heading';
import { SpotlightCard } from '@/components/site/spotlight-card';
import {
  faqItems,
  partialPaymentStory,
  paymentPaceStory,
  pricingTiers,
  startFreeCta,
  verificationLine,
} from '@/lib/site-content';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Start free forever — 2,500 delivery tasks per month. Paid tiers from 4,500 ETB per month. Pay by bank transfer to CBE or Dashen, no card required.',
};

function formatEtb(value: number): string {
  return `${value.toLocaleString('en-US')} ETB`;
}

function formatEtbRate(value: number): string {
  return `${value.toFixed(2)} ETB`;
}

/* FAQ structured data for SEO */
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

export default function PricingPage() {
  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <PageHero
        eyebrow="Pricing"
        title="Simple prices in ETB"
        description="Start on the Free tier forever. Upgrade from inside your workspace when you outgrow it, and pay by bank transfer to CBE or Dashen — no card required."
        actions={
          <MagneticLink href="/launch" variant="primary">
            {startFreeCta}
          </MagneticLink>
        }
      />

      <section className="section-shell pt-10 sm:pt-14">
        <SectionHeading
          eyebrow="Paid tiers"
          title="Three tiers with flat prices and clear overage rates"
          description="Every paid tier has a flat price and clear overage rates. The price shown is the price."
        />
        <div className="mt-8 grid grid-cols-1 divide-y divide-[#e5e4e0] border-y border-[#e5e4e0] md:grid-cols-3 md:divide-x md:divide-y-0">
          {pricingTiers.map((tier) => {
            const bullets: string[] = [];
            if (tier.included_units.delivery_tasks !== null) {
              bullets.push(`${tier.included_units.delivery_tasks.toLocaleString('en-US')} delivery tasks included`);
            } else {
              bullets.push('Unlimited delivery tasks');
            }
            if (tier.included_units.route_optimizations !== null) {
              bullets.push(`${tier.included_units.route_optimizations.toLocaleString('en-US')} route optimizations included`);
            } else {
              bullets.push('Unlimited route optimizations');
            }
            if (tier.overage_rates.delivery_tasks !== null && tier.overage_rates.route_optimizations !== null) {
              bullets.push(
                `Extra delivery tasks: ${formatEtbRate(tier.overage_rates.delivery_tasks)} each`,
                `Extra route optimizations: ${formatEtbRate(tier.overage_rates.route_optimizations)} each`,
              );
            } else {
              bullets.push('No overage rates');
            }

            return (
              <article key={tier.name} className="min-w-0 px-0 py-6 md:px-6 md:first:pl-0 md:last:pr-0">
                <p className="kicker">{tier.billing_cycle}</p>
                <h3 className="mt-2 text-lg font-semibold text-[#252522]">{tier.name}</h3>
                <p className="mt-2 text-[clamp(1.6rem,3vw,2.2rem)] font-semibold tracking-[-0.025em] text-[#252522]">{formatEtb(tier.price_etb)}</p>
                <p className="mt-1.5 text-sm text-[#73736e]">{tier.summary}</p>
                <ul className="mt-5 space-y-2 border-t border-[#efeeea] pt-4 text-[13px] leading-5 text-[#5f5f59]">
                  {bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#087f72]" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <MagneticLink href="/launch" variant="secondary">
                    {startFreeCta}
                  </MagneticLink>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section-shell pt-12 sm:pt-16">
        <div className="rounded-xl bg-[#f7f7f5] px-5 py-7 sm:px-8 sm:py-9">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <SectionHeading
              eyebrow="Payments"
              title="Pay by bank transfer to CBE or Dashen"
              description="No card is ever required. Partial payments are welcome at any point."
            />
            <div>
              <p className="max-w-[46rem] text-sm leading-7 text-[#5f5f59]">{partialPaymentStory}</p>
              <p className="mt-3 text-sm leading-7 text-[#5f5f59]">{paymentPaceStory}</p>
              <p className="mt-3 text-sm font-medium text-[#252522]">{verificationLine}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell py-12 sm:py-16">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <SectionHeading
              eyebrow="Questions"
              title="Frequently asked questions"
              description="Commercial details, the free tier, and paid-tier terms explained plainly."
            />
          </div>
          <div>
            <FaqAccordion items={faqItems} />
          </div>
        </div>
      </section>
    </>
  );
}

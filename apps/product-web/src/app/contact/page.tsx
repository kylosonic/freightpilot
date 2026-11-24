import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail } from 'lucide-react';

import { ContactForm } from '@/components/site/contact-form';
import { PageHero } from '@/components/site/page-hero';
import { SpotlightCard } from '@/components/site/spotlight-card';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact FreightPilot for support, billing, or workspace rollout questions.',
};

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@freightpilot.app';

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Get in touch"
        title="Send us a message"
        description="We read every message. Replies are manual and may take a few days."
      />

      <section className="section-shell pb-16 pt-10 sm:pb-20 sm:pt-14">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-16">
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-[#252522]">How can we help?</h2>
              <p className="mt-2 text-sm leading-7 text-[#5f5f59]">
                Fill out the form and we will read your message. Replies are manual and may take a
                few days. For technical questions, review the{' '}
                <Link href="/docs" className="font-medium text-[#176b5c] underline underline-offset-4">
                  implementation docs
                </Link>
                .
              </p>
            </div>

            <div className="space-y-4">
              <SpotlightCard className="flex items-start gap-4 p-5">
                <div className="inline-flex rounded-md border border-[#e5e4e0] bg-[#f7f7f5] p-2.5">
                  <Mail className="h-5 w-5 text-[#087f72]" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#252522]">Email us</h3>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="mt-1 inline-block text-sm text-[#5f5f59] underline-offset-4 hover:text-[#176b5c] hover:underline"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </div>
              </SpotlightCard>
            </div>
          </div>

          <div className="rounded-lg border border-[#e5e4e0] bg-white p-5 sm:p-7">
            <h2 className="mb-5 text-lg font-semibold text-[#252522]">Send a message</h2>
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}

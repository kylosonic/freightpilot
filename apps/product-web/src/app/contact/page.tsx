import { Mail } from 'lucide-react';

import { ContactForm } from '@/components/site/contact-form';
import { PageHero } from '@/components/site/page-hero';
import { SpotlightCard } from '@/components/site/spotlight-card';

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
              <h2 className="text-xl font-semibold text-[#172a24]">How can we help?</h2>
              <p className="mt-2 text-sm leading-7 text-[#5b6d66]">
                Fill out the form and we will read your message. Replies are manual and may take a
                few days. For technical questions, check the documentation links in the footer.
              </p>
            </div>

            <div className="space-y-4">
              <SpotlightCard className="flex items-start gap-4 p-5">
                <div className="inline-flex border border-[#d7dfdc] bg-[#f8faf9] p-2.5">
                  <Mail className="h-5 w-5 text-[#087f72]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#172a24]">Email us</h3>
                  <p className="mt-1 text-sm text-[#5b6d66]">nahomgwmichael@gmail.com</p>
                </div>
              </SpotlightCard>
            </div>
          </div>

          <div className="border border-[#d7dfdc] bg-white p-5 sm:p-7">
            <h3 className="mb-5 text-lg font-semibold text-[#172a24]">Send a message</h3>
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}

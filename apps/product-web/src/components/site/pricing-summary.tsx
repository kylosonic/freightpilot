import {
  freeLine,
  partialPaymentStory,
  pricingTiers,
} from '@/lib/site-content';

function formatEtb(value: number): string {
  return `${value.toLocaleString('en-US')} ETB`;
}

/**
 * Compact pricing summary (NB-39): 3 paid-tier rows + Free line +
 * partial-payment story. Server component — static, zero motion.
 */
export function PricingSummary() {
  return (
    <section className="section-shell pt-14 sm:pt-18" data-section="pricing-summary">
      <div className="border-y border-[#d7dfdc] py-8 sm:py-10">
        <p className="kicker">Pricing</p>
        <h2 className="mt-3 max-w-[20ch] font-display text-[clamp(1.75rem,3.4vw,2.7rem)] font-semibold leading-[1.08] text-[#172a24]">
          Simple prices in ETB
        </h2>

        <div className="table-scroll mt-8">
          <table className="w-full min-w-[600px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#d7dfdc] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#63766f]">
                <th scope="col" className="pb-3 pr-4">Tier</th>
                <th scope="col" className="pb-3 pr-4">Flat price</th>
                <th scope="col" className="pb-3 pr-4">Billing cycle</th>
                <th scope="col" className="pb-3">What&rsquo;s included</th>
              </tr>
            </thead>
            <tbody>
              {pricingTiers.map((tier) => (
                <tr key={tier.name} className="border-b border-[#e6ebe8] last:border-0">
                  <td className="py-3.5 pr-4 text-sm font-semibold text-[#172a24]">{tier.name}</td>
                  <td className="py-3.5 pr-4 font-mono text-sm text-[#40534c]">{formatEtb(tier.price_etb)}</td>
                  <td className="py-3.5 pr-4 text-sm text-[#52665e]">{tier.billing_cycle}</td>
                  <td className="py-3.5 text-sm leading-6 text-[#5b6d66]">{tier.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-7 text-sm font-semibold text-[#172a24]">{freeLine}</p>
        <p className="mt-3 max-w-[44rem] text-sm leading-7 text-[#5b6d66]">{partialPaymentStory}</p>
      </div>
    </section>
  );
}

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
    <section className="section-shell pt-16 sm:pt-20" data-section="pricing-summary">
      <div className="mx-auto max-w-[980px]">
        <p className="kicker">Pricing</p>
        <h2 className="site-heading mt-2 max-w-[20ch]">
          Simple prices in ETB
        </h2>

        <div className="table-scroll mt-8">
          <table className="w-full min-w-[600px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#e5e4e0] text-[11px] font-medium text-[#73736e]">
                <th scope="col" className="pb-3 pr-4">Tier</th>
                <th scope="col" className="pb-3 pr-4">Flat price</th>
                <th scope="col" className="pb-3 pr-4">Billing cycle</th>
                <th scope="col" className="pb-3">What&rsquo;s included</th>
              </tr>
            </thead>
            <tbody>
              {pricingTiers.map((tier) => (
                <tr key={tier.name} className="border-b border-[#efeeea] last:border-0">
                  <td className="py-3.5 pr-4 text-sm font-medium text-[#252522]">{tier.name}</td>
                  <td className="py-3.5 pr-4 text-sm text-[#454540]">{formatEtb(tier.price_etb)}</td>
                  <td className="py-3.5 pr-4 text-sm text-[#5f5f59]">{tier.billing_cycle}</td>
                  <td className="py-3.5 text-sm leading-6 text-[#73736e]">{tier.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-7 text-sm font-medium text-[#252522]">{freeLine}</p>
        <p className="mt-3 max-w-[44rem] text-sm leading-7 text-[#73736e]">{partialPaymentStory}</p>
      </div>
    </section>
  );
}

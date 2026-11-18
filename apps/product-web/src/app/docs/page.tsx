import type { Metadata } from 'next';

import { MagneticLink } from '@/components/site/magnetic-link';
import { PageHero } from '@/components/site/page-hero';
import { SectionHeading } from '@/components/site/section-heading';
import { SpotlightCard } from '@/components/site/spotlight-card';
import { startFreeCta } from '@/lib/site-content';

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'FreightPilot getting-started guide, CSV schemas, core API surfaces, authentication, and data limitations.',
};

const apiBase = (
  process.env.NEXT_PUBLIC_PLATFORM_API_URL ||
  'https://freightpilot-api.freightpilot.workers.dev/api/v1'
).replace(/\/$/, '');
const apiRoot = apiBase.replace(/\/api\/v1$/, '');
const apiDocsUrl = `${apiRoot}/docs`;

const csvSchemas = [
  {
    name: 'Warehouses',
    columns: 'code,name,address,city,state,country,latitude,longitude,capacity_units',
  },
  {
    name: 'Items',
    columns: 'sku,name,category,unit_price,reorder_level',
  },
  {
    name: 'Fleet assets',
    columns: 'vehicle_code,driver_name,capacity_units',
  },
  {
    name: 'Inventory',
    columns: 'warehouse_code,sku,quantity_on_hand,safety_stock',
  },
  {
    name: 'Orders',
    columns: 'order_date,warehouse_code,sku,quantity,unit_price,customer_region',
  },
];

export default function DocsPage() {
  return (
    <>
      <PageHero
        eyebrow="Documentation"
        title="Start with a real operating loop"
        description="This guide covers the fastest path from a new workspace to a route plan, real data import, and bank-transfer receipt evidence. It also states which calculations are real and which are still simulated."
        actions={
          <MagneticLink href="/launch" variant="primary">
            {startFreeCta}
          </MagneticLink>
        }
      />

      <section className="section-shell pt-10 sm:pt-14">
        <SectionHeading
          eyebrow="Getting started"
          title="Five steps to a useful workspace"
          description="Use the sample workspace for the first route. Replace it with real operational data only after the workflow is understood."
        />
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {[
            ['01', 'Create a workspace', 'Use a company email domain on the launch page. The workspace starts on the Free tier with sample data.'],
            ['02', 'Run a sample route', 'Open Route Studio, keep the seeded warehouses, and run one optimization. Review the map, stops, and decision brief.'],
            ['03', 'Import real CSVs', 'Import warehouses, items, fleet assets, inventory, then orders. Fix row-level upload errors before moving on.'],
            ['04', 'Assign drivers and cash', 'Add drivers from the workspace, assign shipments, and record expected cash on delivery.'],
            ['05', 'Close the day', 'Review outstanding, collected, and settled cash. Escalate shortfalls and keep the audit trail intact.'],
          ].map(([step, title, body]) => (
            <SpotlightCard key={step}>
              <p className="kicker">{step}</p>
              <h3 className="mt-2 text-base font-semibold text-[#172a24]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5b6d66]">{body}</p>
            </SpotlightCard>
          ))}
        </div>
      </section>

      <section className="section-shell pt-10 sm:pt-14">
        <SectionHeading
          eyebrow="CSV schemas"
          title="Import in dependency order"
          description="Warehouses and items are required before inventory and orders. Fleet assets are required before driver assignment."
        />
        <div className="mt-7 grid border-t border-[#d7dfdc]">
          {csvSchemas.map((schema) => (
            <div
              key={schema.name}
              className="grid gap-2 border-b border-[#d7dfdc] bg-white p-3 sm:grid-cols-[160px_1fr] sm:items-start"
            >
              <p className="text-sm font-semibold text-[#172a24]">{schema.name}</p>
              <code className="overflow-x-auto text-xs leading-6 text-[#087f72]">{schema.columns}</code>
            </div>
          ))}
        </div>
      </section>

      <section id="api" className="section-shell pt-10 sm:pt-14">
        <SectionHeading
          eyebrow="API"
          title="Use the same data contract as the console"
          description="The API is versioned under /api/v1. Multi-workspace users should send X-Organization-Id when selecting a workspace."
        />
        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          <SpotlightCard>
            <h3 className="text-base font-semibold text-[#172a24]">Authentication</h3>
            <p className="mt-2 text-sm leading-6 text-[#5b6d66]">
              Sign in through the console or call POST /api/v1/auth/login with a company email and password.
              Send the returned token as a Bearer token. Business endpoints require an active workspace
              membership; an unaffiliated account is denied.
            </p>
            <div className="mt-5">
              <MagneticLink href={apiDocsUrl} variant="secondary" external>
                Open API reference
              </MagneticLink>
            </div>
          </SpotlightCard>
          <SpotlightCard>
            <h3 className="text-base font-semibold text-[#172a24]">Core surfaces</h3>
            <ul className="mt-2 space-y-2 text-sm leading-7 text-[#5b6d66]">
              <li><code className="text-[#087f72]">POST /routes/optimize</code> — plan a route from warehouse demand.</li>
              <li><code className="text-[#087f72]">GET /routes/history</code> — review previous route runs and explanations.</li>
              <li><code className="text-[#087f72]">POST /receipts/upload</code> — submit bank-transfer evidence.</li>
              <li><code className="text-[#087f72]">GET /cash-collections/ledger</code> — review driver cash position.</li>
              <li><code className="text-[#087f72]">GET /ops/exception-feed</code> — review open operational exceptions.</li>
            </ul>
          </SpotlightCard>
        </div>
      </section>

      <section className="section-shell py-10 sm:py-14">
        <SpotlightCard>
          <h3 className="text-lg font-semibold text-[#172a24]">Data and calculation limitations</h3>
          <div className="mt-3 grid gap-4 text-sm leading-7 text-[#5b6d66] lg:grid-cols-2">
            <p>
              Route optimization and route explanations are deterministic calculations over the data in
              the workspace. Demand forecasting uses a deterministic trend model with a held-out
              quality check; the displayed planning range is an estimate, not a guarantee.
            </p>
            <p>
              Weather risk and any rerouting candidate remain simulated or saved-route candidates until a
              live provider is connected. They must not be treated as live traffic, live weather, or a
              confirmed carrier commitment. Receipt extraction is advisory and requires human verification.
            </p>
          </div>
          <p className="mt-4 text-sm leading-7 text-[#5b6d66]">
            For help or a data correction, use the <a className="font-semibold text-[#087f72] underline underline-offset-4" href="/contact">contact page</a>.
          </p>
        </SpotlightCard>
      </section>
    </>
  );
}

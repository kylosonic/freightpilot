import type { Metadata } from 'next';

import { MagneticLink } from '@/components/site/magnetic-link';
import { PageHero } from '@/components/site/page-hero';
import { SectionHeading } from '@/components/site/section-heading';
import { SpotlightCard } from '@/components/site/spotlight-card';
import { startFreeCta } from '@/lib/site-content';

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'FreightPilot setup guide, file formats, API basics, sign-in, and current data limits.',
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
    columns: 'sku,name,category,unit_cost,reorder_level',
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
        title="Set up your workspace"
        description="Start with sample data, plan a route, add your own files, and upload a bank receipt. This guide also explains what the numbers can and cannot tell you."
        actions={
          <MagneticLink href="/launch" variant="primary">
            {startFreeCta}
          </MagneticLink>
        }
      />

      <section className="section-shell pt-10 sm:pt-14">
        <SectionHeading
          eyebrow="Getting started"
          title="Five steps to get started"
          description="Try the sample route first. Add your own data when you are ready."
        />
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {[
            ['01', 'Create a workspace', 'Use your work email on the launch page. You start on the Free plan with sample data.'],
            ['02', 'Plan a sample route', 'Open Routes, keep the sample warehouses, and plan one route. Check the map and stop order.'],
            ['03', 'Add your data', 'Upload warehouses, items, fleet, inventory, and orders. Fix any file errors before you continue.'],
            ['04', 'Assign drivers and cash', 'Add drivers, assign deliveries, and enter the cash expected at each stop.'],
            ['05', 'Close the day', 'Check cash that is still out, collected, or handed in. Record any missing amount.'],
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
          eyebrow="File formats"
          title="Upload files in this order"
          description="Add warehouses and items before inventory and orders. Add fleet data before you assign drivers."
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
          title="Connect to the same data"
          description="The API is available under /api/v1. If you belong to more than one workspace, send X-Organization-Id to choose one."
        />
        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          <SpotlightCard>
            <h3 className="text-base font-semibold text-[#172a24]">Authentication</h3>
            <p className="mt-2 text-sm leading-6 text-[#5b6d66]">
              Sign in through the console, or send a company email and password to
              POST /api/v1/auth/login. Add the returned token to later requests as a Bearer token.
              You must belong to the workspace you are using.
            </p>
            <div className="mt-5">
              <MagneticLink href={apiDocsUrl} variant="secondary" external>
                Open API reference
              </MagneticLink>
            </div>
          </SpotlightCard>
          <SpotlightCard>
          <h3 className="text-base font-semibold text-[#172a24]">Main API actions</h3>
            <ul className="mt-2 space-y-2 text-sm leading-7 text-[#5b6d66]">
              <li><code className="text-[#087f72]">POST /routes/optimize</code> — plan a route from warehouse demand.</li>
              <li><code className="text-[#087f72]">GET /routes/history</code> — review previous route runs and explanations.</li>
              <li><code className="text-[#087f72]">POST /receipts/upload</code> — submit bank-transfer evidence.</li>
              <li><code className="text-[#087f72]">GET /cash-collections/ledger</code> — review driver cash position.</li>
              <li><code className="text-[#087f72]">GET /ops/exception-feed</code> — review open issues.</li>
            </ul>
          </SpotlightCard>
        </div>
      </section>

      <section className="section-shell py-10 sm:py-14">
        <SpotlightCard>
          <h3 className="text-lg font-semibold text-[#172a24]">What the numbers mean</h3>
          <div className="mt-3 grid gap-4 text-sm leading-7 text-[#5b6d66] lg:grid-cols-2">
            <p>
              Route plans are calculated from the warehouse, demand, and vehicle data you enter.
              Demand forecasts use past trends and a separate accuracy check. The range is an
              estimate, not a promise.
            </p>
            <p>
              Weather risks and alternate routes are examples until a live service is connected.
              Do not treat them as live traffic or weather. Always check extracted receipt details
              yourself.
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

import { ActivationBanner } from '../components/ActivationBanner';
import { CsvUploadPanel } from '../components/CsvUploadPanel';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';

export function UploadPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Data intake"
        title="Load a workspace in the right operational order"
        description="Bring warehouses, items, fleet assets, inventory, and orders into the system in sequence so routing, forecasting, and exception logic have a stable base."
      />

      <ActivationBanner mode="checklist" />

      <Panel
        eyebrow="Import sequence"
        title="Recommended onboarding order"
        description="Follow the steps top to bottom so downstream files can resolve against upstream warehouse, SKU, and fleet references."
      >
        <ol className="flex flex-wrap items-center gap-2">
          {['Warehouses', 'Items', 'Fleet', 'Inventory', 'Orders'].map((step, index) => (
            <li key={step} className="inline-flex items-center gap-2 border border-[#d7dfdc] bg-[#f8faf9] px-2.5 py-1.5">
              <span className="font-mono text-[10px] text-[#63766f]">0{index + 1}</span>
              <span className="text-xs font-semibold text-[#20372f]">{step}</span>
            </li>
          ))}
        </ol>
      </Panel>

      <CsvUploadPanel />
    </div>
  );
}

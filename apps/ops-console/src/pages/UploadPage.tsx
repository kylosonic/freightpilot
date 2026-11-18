import { ActivationBanner } from '../components/ActivationBanner';
import { CsvUploadPanel } from '../components/CsvUploadPanel';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';

export function UploadPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Import data"
        title="Add your business data"
        description="Add warehouses, items, fleet, inventory, and orders in the order shown."
      />

      <ActivationBanner mode="checklist" />

      <Panel
        title="Recommended onboarding order"
        description="Each file builds on the one before it."
      >
        <ol className="flex flex-wrap items-center gap-2">
          {['Warehouses', 'Items', 'Fleet', 'Inventory', 'Orders'].map((step, index) => (
            <li key={step} className="inline-flex items-center gap-2 rounded-md bg-[#f7f7f5] px-2.5 py-1.5">
              <span className="text-[11px] text-[#85857e]">0{index + 1}</span>
              <span className="text-xs font-medium text-[#353530]">{step}</span>
            </li>
          ))}
        </ol>
      </Panel>

      <CsvUploadPanel />
    </div>
  );
}

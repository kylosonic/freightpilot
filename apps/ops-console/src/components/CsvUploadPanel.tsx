import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useActivationState } from '../hooks/queries';
import { apiErrorMessage } from '../services/authErrors';
import {
  uploadFleetAssetsCsv,
  uploadInventoryCsv,
  uploadItemsCsv,
  uploadOrdersCsv,
  uploadWarehousesCsv,
} from '../services/logisticsApi';

type UploadKind = 'warehouses' | 'items' | 'fleet' | 'inventory' | 'orders';

type UploadSpec = {
  key: UploadKind;
  title: string;
  hint: string;
  actionLabel: string;
};

const uploadSpecs: UploadSpec[] = [
  {
    key: 'warehouses',
    title: 'Upload Warehouses CSV',
    hint: 'Columns: code,name,address,city,state,country,latitude,longitude,capacity_units',
    actionLabel: 'Upload Warehouses',
  },
  {
    key: 'items',
    title: 'Upload Items CSV',
    hint: 'Columns: sku,name,category,unit_cost,reorder_level',
    actionLabel: 'Upload Items',
  },
  {
    key: 'fleet',
    title: 'Upload Fleet Assets CSV (Cars + Drivers)',
    hint: 'Columns: vehicle_code,driver_name,capacity_units (+ optional driver_contact,status)',
    actionLabel: 'Upload Fleet Assets',
  },
  {
    key: 'inventory',
    title: 'Upload Inventory CSV',
    hint: 'Columns: warehouse_code,sku,quantity_on_hand (+ optional safety_stock)',
    actionLabel: 'Upload Inventory',
  },
  {
    key: 'orders',
    title: 'Upload Orders CSV',
    hint: 'Columns: order_date,warehouse_code,sku,quantity (+ optional unit_price,customer_region)',
    actionLabel: 'Upload Orders',
  },
];

export function CsvUploadPanel() {
  const [files, setFiles] = useState<Record<UploadKind, File | null>>({
    warehouses: null,
    items: null,
    fleet: null,
    inventory: null,
    orders: null,
  });
  const [results, setResults] = useState<Partial<Record<UploadKind, string>>>({});
  const [activeKind, setActiveKind] = useState<UploadKind | null>(null);
  const queryClient = useQueryClient();
  const activationQ = useActivationState();
  const freeCapLocked = activationQ.data?.free_cap?.locked ?? false;

  async function submit(kind: UploadKind) {
    const file = files[kind];
    if (!file) return;

    setActiveKind(kind);
    try {
      const response =
        kind === 'warehouses'
          ? await uploadWarehousesCsv(file)
          : kind === 'items'
            ? await uploadItemsCsv(file)
            : kind === 'fleet'
              ? await uploadFleetAssetsCsv(file)
              : kind === 'inventory'
                ? await uploadInventoryCsv(file)
                : await uploadOrdersCsv(file);

        setResults((prev) => ({
          ...prev,
          [kind]: `${kind} import: processed=${response.records_processed}, created=${response.records_created}, updated=${response.records_updated}, errors=${response.errors.length}`,
        }));
        // milestone state reflects without a page reload.
        queryClient.invalidateQueries({ queryKey: ['activation'] });
    } catch (err) {
        setResults((prev) => ({
          ...prev,
          [kind]: `${kind} import failed: ${apiErrorMessage(err, 'import failed')}`,
        }));
    } finally {
        setActiveKind(null);
    }
  }

    const fieldClassName =
      'fp-input file:mr-3 file:border-0 file:bg-[#eef6f2] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#087f72] hover:file:bg-[#e0efea]';

  return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {uploadSpecs.map((spec) => (
          <article key={spec.key} className="fp-row">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-[#20372f]">{spec.title}</h3>
              <span className="border border-[#d7dfdc] bg-[#f5f8f6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#52665e]">
                {spec.key}
              </span>
            </div>

            <p className="mt-1.5 text-xs leading-5 text-[#63766f]">{spec.hint}</p>

            <div className="mt-3 space-y-3">
              <input
                className={fieldClassName}
                type="file"
                accept=".csv"
                onChange={(event) =>
                  setFiles((prev) => ({
                    ...prev,
                    [spec.key]: event.target.files?.[0] || null,
                  }))
                }
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  disabled={!files[spec.key] || activeKind !== null || freeCapLocked}
                  onClick={() => submit(spec.key)}
                  className="glow-ring inline-flex min-h-9 items-center justify-center gap-2 bg-[#087f72] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#06675d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {activeKind === spec.key ? 'Uploading...' : freeCapLocked ? 'Writes locked (Free cap)' : spec.actionLabel}
                </button>
                <span className="text-xs text-[#63766f]">{files[spec.key]?.name || 'No file selected'}</span>
              </div>
            </div>

            {results[spec.key] ? <p className="mt-2 text-xs text-[#40534c]">{results[spec.key]}</p> : null}
          </article>
        ))}
    </div>
  );
}

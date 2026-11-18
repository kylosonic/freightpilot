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
      <div className="divide-y divide-[#e5e4e0] border-y border-[#e5e4e0]">
        {uploadSpecs.map((spec) => (
          <article key={spec.key} className="py-5 first:pt-4 last:pb-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-[#252522]">{spec.title}</h3>
              <span className="rounded-full bg-[#f1f1ef] px-2 py-0.5 text-xs text-[#73736e]">{spec.key}</span>
            </div>

            <p className="mt-1 text-xs leading-5 text-[#73736e]">{spec.hint}</p>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                className={`${fieldClassName} min-w-0 flex-1`}
                type="file"
                accept=".csv"
                aria-label={`Choose ${spec.title} file`}
                onChange={(event) =>
                  setFiles((prev) => ({
                    ...prev,
                    [spec.key]: event.target.files?.[0] || null,
                  }))
                }
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  disabled={!files[spec.key] || activeKind !== null || freeCapLocked}
                  onClick={() => submit(spec.key)}
                  className="fp-action-secondary"
                >
                  {activeKind === spec.key ? 'Uploading...' : freeCapLocked ? 'Writes locked (Free cap)' : spec.actionLabel}
                </button>
                <span className="text-xs text-[#73736e]">{files[spec.key]?.name || 'No file selected'}</span>
              </div>
            </div>

            {results[spec.key] ? <p className="mt-2 text-xs text-[#454540]">{results[spec.key]}</p> : null}
          </article>
        ))}
    </div>
  );
}

import type { CashCollection, CashLedgerSummary } from '../../types/api';
import { Panel } from '../ui/Panel';
import { StatusBadge } from '../ui/StatusBadge';
import { cashTone, etb } from './driverFormatting';

type DriverCashLedgerPanelProps = {
  collections: CashCollection[];
  ledger: CashLedgerSummary;
  loading: boolean;
  canManageFleet: boolean;
  onDeclare: (record: CashCollection) => void;
  onSettle: (record: CashCollection) => void;
};

export function DriverCashLedgerPanel({
  collections,
  ledger,
  loading,
  canManageFleet,
  onDeclare,
  onSettle,
}: DriverCashLedgerPanelProps) {
  return (
    <Panel
      eyebrow="End of day"
      title="Cash position"
      description="Record what each driver has collected. Once the office receives the cash, mark it as handed in."
    >
      <div className="space-y-3">
        {collections.map((record) => (
          <article key={record.id} className="fp-row">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={record.status} tone={cashTone(record.status)} />
                  <span className="text-[11px] text-[#73736e]">{record.shipment_no}</span>
                </div>
                <h3 className="mt-1.5 text-sm font-semibold text-[#252522]">
                  {record.driver_name || 'Unassigned driver'}
                </h3>
              </div>
              <div className="text-right font-mono text-xs text-[#5f5f59] tabular-nums">
                <p>Expected {etb(record.expected_etb)}</p>
                <p>Collected {etb(record.collected_etb)}</p>
                <p className={Number(record.shortfall_etb ?? 0) > 0 ? 'text-[#885100]' : 'text-[#73736e]'}>
                  Shortfall {etb(record.shortfall_etb)}
                </p>
              </div>
            </div>

            {record.note ? <p className="mt-1.5 text-xs leading-5 text-[#5f5f59]">{record.note}</p> : null}

            <div className="mt-3 flex flex-wrap gap-2">
              {record.status === 'outstanding' ? (
                <button
                  type="button"
                  onClick={() => onDeclare(record)}
                  className="fp-action-secondary !min-h-8 text-xs"
                >
                  Record cash
                </button>
              ) : null}
              {canManageFleet && record.status !== 'settled' && record.status !== 'voided' ? (
                <button
                  type="button"
                  onClick={() => onSettle(record)}
                  className="fp-action-quiet !min-h-8 !text-[#14745f]"
                >
                  Settle
                </button>
              ) : null}
            </div>
          </article>
        ))}

        {!loading && collections.length === 0 ? (
          <div className="rounded-md bg-[#f7f7f5] p-6 text-center">
            <p className="text-sm font-semibold text-[#454540]">No cash to collect right now</p>
            <p className="mt-1 text-xs text-[#73736e]">
              A cash record opens when a cash-on-delivery shipment is marked delivered on the Shipments board.
            </p>
          </div>
        ) : null}
      </div>

      <p className="mt-3 text-xs text-[#5f5f59]">
        Settled to date: <span className="font-mono text-[#252522]">{etb(ledger.settled_etb)}</span> across{' '}
        {ledger.settled_count} collections.
      </p>
    </Panel>
  );
}

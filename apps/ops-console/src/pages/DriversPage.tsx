import { FormEvent, useEffect, useState } from 'react';

import { Dialog } from '../components/ui/Dialog';
import { MetricTile } from '../components/ui/MetricTile';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../services/authErrors';
import {
  createDriver,
  deactivateDriver,
  declareCash,
  getCashLedger,
  listCashCollections,
  listDriverShipments,
  listDrivers,
  settleCash,
} from '../services/logisticsApi';
import type {
  CashCollection,
  CashLedgerSummary,
  CashCollectionStatus,
  Driver,
  DriverShipment,
  DriverStatus,
} from '../types/api';

/**
 * Driver roster and end-of-day cash position (NB-86).
 *
 * The operator question this page answers is asked twice a day and in two
 * directions: in the morning, *who is carrying what*, and at closing, *how much
 * cash is still out with drivers and how much never came back*. Both are cash
 * risk in this market, so they live on one surface rather than behind a filter.
 */

const EMPTY_LEDGER: CashLedgerSummary = {
  outstanding_count: 0,
  outstanding_expected_etb: '0.00',
  collected_count: 0,
  collected_etb: '0.00',
  settled_count: 0,
  settled_etb: '0.00',
  shortfall_etb: '0.00',
};

function driverTone(status: DriverStatus) {
  return status === 'active' ? 'success' : 'neutral';
}

function cashTone(status: CashCollectionStatus) {
  if (status === 'settled') return 'success';
  if (status === 'outstanding') return 'warning';
  if (status === 'voided') return 'danger';
  return 'info';
}

/** Money is summed as a decimal string on the server; this only formats it. */
function etb(value: string | number | null | undefined): string {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return '0.00 ETB';
  return `${parsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton ${className ?? ''}`} />;
}

function DeclareCashDialog({
  record,
  busy = false,
  onConfirm,
  onCancel,
}: {
  record: CashCollection;
  busy?: boolean;
  onConfirm: (collected: number, note: string) => void;
  onCancel: () => void;
}) {
  const [collected, setCollected] = useState<string>(record.collected_etb ?? '0');
  const [note, setNote] = useState('');

  const expected = Number(record.expected_etb ?? 0);
  const entered = Number(collected);
  const shortfall = Number.isFinite(entered) ? Math.max(0, expected - entered) : 0;

  return (
    <Dialog
      eyebrow="Cash on hand"
      title={`Record cash for ${record.shipment_no}`}
      description={`We expect ${etb(record.expected_etb)}. Enter the amount the driver actually has. If it is less, we record the difference.`}
      onClose={() => { if (!busy) onCancel(); }}
      actions={
        <>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="fp-action-secondary !min-h-8 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(entered, note)}
            disabled={busy || !Number.isFinite(entered) || entered < 0}
            className="fp-action-primary !min-h-8 text-xs"
          >
            {busy ? 'Saving...' : 'Record cash'}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <label className="grid gap-1.5 text-xs font-medium text-[#454540]">
          Cash collected (ETB)
          <input
            autoFocus
            className="fp-input"
            type="number"
            min={0}
            step="0.01"
            value={collected}
            onChange={(e) => setCollected(e.target.value)}
          />
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-[#454540]">
          Note (optional)
          <textarea
            className="fp-input min-h-20 px-4 py-3"
            placeholder="Anything the office should know about this collection..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <p className={`text-xs ${shortfall > 0 ? 'text-[#885100]' : 'text-[#5f5f59]'}`}>
          {shortfall > 0
            ? `Shortfall of ${etb(shortfall)} will be recorded against this delivery.`
            : 'This clears the expected amount in full.'}
        </p>
      </div>
    </Dialog>
  );
}

function SettleCashDialog({
  record,
  busy = false,
  onConfirm,
  onCancel,
}: {
  record: CashCollection;
  busy?: boolean;
  onConfirm: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState('');

  return (
    <Dialog
      eyebrow="Cash handover"
      title={`Settle cash for ${record.shipment_no}`}
      description="Use this after the office receives the cash. It closes the record and keeps any missing amount visible."
      onClose={() => { if (!busy) onCancel(); }}
      actions={
        <>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="fp-action-secondary !min-h-8 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm(note)}
            className="fp-action-primary !min-h-8 text-xs"
          >
            {busy ? 'Settling...' : 'Settle'}
          </button>
        </>
      }
    >
      <label className="grid gap-1.5 text-xs font-medium text-[#454540]">
        Settlement note (optional)
        <textarea
          autoFocus
          className="fp-input min-h-20 px-4 py-3"
          placeholder="e.g. Cash banked with the CBE deposit on Monday."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
    </Dialog>
  );
}

export function DriversPage() {
  const { user } = useAuth();
  const canManageFleet = user?.role === 'admin' || user?.role === 'owner';

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [ledger, setLedger] = useState<CashLedgerSummary>(EMPTY_LEDGER);
  const [collections, setCollections] = useState<CashCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [van, setVan] = useState<{ driverName: string; shipments: DriverShipment[] } | null>(null);
  const [declareTarget, setDeclareTarget] = useState<CashCollection | null>(null);
  const [settleTarget, setSettleTarget] = useState<CashCollection | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Driver | null>(null);
  const [cashBusy, setCashBusy] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    license_no: '',
    vehicle_plate: '',
    notes: '',
  });

  async function loadAll() {
    try {
      setError(null);
      const [roster, ledgerRow, cash] = await Promise.all([
        listDrivers(),
        getCashLedger(),
        listCashCollections(),
      ]);
      setDrivers(roster);
      setLedger(ledgerRow);
      setCollections(cash);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load the driver roster and cash ledger'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function onCreateDriver(event: FormEvent) {
    event.preventDefault();
    try {
      setSaving(true);
      setError(null);
      await createDriver({
        full_name: form.full_name,
        phone: form.phone,
        license_no: form.license_no || undefined,
        vehicle_plate: form.vehicle_plate || undefined,
        notes: form.notes || undefined,
      });
      setForm({ full_name: '', phone: '', license_no: '', vehicle_plate: '', notes: '' });
      await loadAll();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to add the driver'));
    } finally {
      setSaving(false);
    }
  }

  async function onDeactivate(driver: Driver) {
    setDeactivating(true);
    try {
      setError(null);
      await deactivateDriver(driver.id);
      setDeactivateTarget(null);
      await loadAll();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to deactivate the driver'));
      setDeactivateTarget(null);
    } finally {
      setDeactivating(false);
    }
  }

  async function onShowVan(driver: Driver) {
    try {
      setError(null);
      const shipments = await listDriverShipments(driver.id);
      setVan({ driverName: driver.full_name, shipments });
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load what this driver is carrying'));
    }
  }

  async function onDeclareConfirm(collected: number, note: string) {
    if (!declareTarget) return;
    setCashBusy(true);
    try {
      setError(null);
      await declareCash(declareTarget.id, { collected_etb: collected, note: note || undefined });
      await loadAll();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the cash amount'));
    } finally {
      setCashBusy(false);
      setDeclareTarget(null);
    }
  }

  async function onSettleConfirm(note: string) {
    if (!settleTarget) return;
    setCashBusy(true);
    try {
      setError(null);
      await settleCash(settleTarget.id, { note: note || undefined });
      await loadAll();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to settle this cash record'));
    } finally {
      setCashBusy(false);
      setSettleTarget(null);
    }
  }

  const activeCount = drivers.filter((driver) => driver.status === 'active').length;
  const shortfall = Number(ledger.shortfall_etb ?? 0);

  return (
    <div className="space-y-4">
      {declareTarget ? (
        <DeclareCashDialog
          record={declareTarget}
          busy={cashBusy}
          onConfirm={onDeclareConfirm}
          onCancel={() => setDeclareTarget(null)}
        />
      ) : null}

      {settleTarget ? (
        <SettleCashDialog
          record={settleTarget}
          busy={cashBusy}
          onConfirm={onSettleConfirm}
          onCancel={() => setSettleTarget(null)}
        />
      ) : null}

      {deactivateTarget ? (
        <Dialog
          eyebrow="Driver status"
          title={`Deactivate ${deactivateTarget.full_name}?`}
          description="They will no longer appear for new dispatch assignments. Existing cash and shipment records stay intact."
          onClose={() => { if (!deactivating) setDeactivateTarget(null); }}
          actions={
            <>
              <button
                type="button"
                disabled={deactivating}
                onClick={() => setDeactivateTarget(null)}
                className="fp-action-secondary !min-h-8 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deactivating}
                onClick={() => void onDeactivate(deactivateTarget)}
                className="fp-action-danger !min-h-8 text-xs"
              >
                {deactivating ? 'Deactivating...' : 'Deactivate driver'}
              </button>
            </>
          }
        />
      ) : null}

      <PageHeader
        eyebrow="Fleet and cash"
        title="Fleet and cash"
        description="See who is on the road, how much cash they have, and what still needs to be handed in."
      />

      <div className="grid overflow-hidden rounded-lg border border-[#e5e4e0] bg-white sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-[#efeeea]">
        <MetricTile
          title="Active drivers"
          value={activeCount}
          detail={`${drivers.length} on the roster`}
          tone="info"
        />
        <MetricTile
          title="Cash with drivers"
          value={etb(ledger.outstanding_expected_etb)}
          detail={`${ledger.outstanding_count} awaiting cash`}
          tone={ledger.outstanding_count > 0 ? 'warning' : 'neutral'}
        />
        <MetricTile
          title="Collected, not banked"
          value={etb(ledger.collected_etb)}
          detail={`${ledger.collected_count} not yet settled`}
          tone="neutral"
        />
        <MetricTile
          title="Shortfall"
          value={etb(ledger.shortfall_etb)}
          detail={
            shortfall > 0
              ? 'Collected short of expected'
              : 'Every collection matches what was expected.'
          }
          tone={shortfall > 0 ? 'danger' : 'success'}
        />
      </div>

      {error ? <p role="alert" className="border border-[#e7c2be] bg-[#fff8f7] px-3 py-2 text-sm text-[#8f302a]">{error}</p> : null}

      <Panel
        eyebrow="Roster"
        title="Add a driver"
        description="The phone number is how you will recognise each driver, so please check it carefully."
      >
        <form className="grid grid-cols-1 gap-3 lg:grid-cols-5" onSubmit={onCreateDriver}>
          <label className="grid gap-1.5 text-xs font-medium text-[#454540]">
            Full name
            <input
              className="fp-input"
              placeholder="Yohannes Tesfaye"
              value={form.full_name}
              onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
              required
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-[#454540]">
            Phone
            <input
              className="fp-input"
              placeholder="+251911000001"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              required
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-[#454540]">
            License no
            <input
              className="fp-input"
              placeholder="ET-DRV-00000"
              value={form.license_no}
              onChange={(e) => setForm((prev) => ({ ...prev, license_no: e.target.value }))}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-[#454540]">
            Vehicle plate
            <input
              className="fp-input"
              placeholder="AA-3-B12345"
              value={form.vehicle_plate}
              onChange={(e) => setForm((prev) => ({ ...prev, vehicle_plate: e.target.value }))}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-[#454540]">
            Notes
            <input
              className="fp-input"
              placeholder="Assigned to the Bole run"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </label>
          <div className="flex justify-end sm:col-span-2 lg:col-span-3 xl:col-span-5">
            <button
              type="submit"
              disabled={saving}
              className="fp-action-primary"
            >
              {saving ? (
                <svg className="animate-spin-slow h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="50 20" />
                </svg>
              ) : null}
              {saving ? 'Adding...' : 'Add driver'}
            </button>
          </div>
        </form>
      </Panel>

      <Panel
        eyebrow="Roster"
        title="Who is on the fleet today"
        description="Choose a driver to see their current deliveries and cash."
      >
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <SkeletonBlock key={i} className="h-[96px]" />
            ))}
          </div>
        ) : null}

        <div className="space-y-3">
          {drivers.map((driver) => (
            <article key={driver.id} className="fp-row">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={driver.status} tone={driverTone(driver.status)} />
                    <span className="text-xs text-[#73736e]">{driver.phone}</span>
                  </div>
                  <h3 className="mt-1.5 text-sm font-semibold text-[#252522]">
                    {driver.full_name}
                  </h3>
                </div>
                <div className="text-right font-mono text-xs text-[#5f5f59] tabular-nums">
                  <p>{driver.vehicle_plate || 'No plate on file'}</p>
                  <p>{driver.license_no || 'No license on file'}</p>
                </div>
              </div>

              {driver.notes ? (
                <p className="mt-1.5 text-xs leading-5 text-[#5f5f59]">{driver.notes}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onShowVan(driver)}
                  className="fp-action-secondary !min-h-8 text-xs"
                >
                  What is on the van
                </button>
                {canManageFleet && driver.status === 'active' ? (
                  <button
                    type="button"
                    onClick={() => setDeactivateTarget(driver)}
                    className="fp-action-quiet !min-h-8 !text-[#a3342f]"
                  >
                    Deactivate
                  </button>
                ) : null}
              </div>
            </article>
          ))}

          {!loading && drivers.length === 0 ? (
            <div className="rounded-md bg-[#f7f7f5] p-6 text-center">
              <p className="text-sm font-semibold text-[#454540]">No drivers on the roster</p>
              <p className="mt-1 text-xs text-[#73736e]">
                Add your first driver above. A fleet CSV upload does not create drivers — the roster is maintained here.
              </p>
            </div>
          ) : null}
        </div>
      </Panel>

      {van ? (
        <Panel
          eyebrow="Current load"
          title={`What ${van.driverName} is carrying`}
          description="Open shipments assigned to this driver, newest schedule first."
        >
          <div className="space-y-3">
            {van.shipments.map((shipment) => (
              <div key={shipment.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#efeeea] py-2">
                <div className="flex items-center gap-3">
                  <StatusBadge
                    label={shipment.status}
                    tone={
                      shipment.status === 'delivered'
                        ? 'success'
                        : shipment.status === 'delayed' || shipment.status === 'cancelled'
                          ? 'danger'
                          : shipment.status === 'in_transit'
                            ? 'info'
                            : 'neutral'
                    }
                  />
                  <span className="text-xs text-[#252522]">{shipment.shipment_no}</span>
                </div>
                <span className="font-mono text-xs text-[#5f5f59] tabular-nums">
                  COD {etb(shipment.cod_amount_etb)}
                </span>
              </div>
            ))}
            {van.shipments.length === 0 ? (
              <p className="text-xs text-[#73736e]">Nothing assigned to this driver right now.</p>
            ) : null}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setVan(null)}
                className="fp-action-secondary !min-h-8 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </Panel>
      ) : null}

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
                    onClick={() => setDeclareTarget(record)}
                    className="fp-action-secondary !min-h-8 text-xs"
                  >
                    Record cash
                  </button>
                ) : null}
                {canManageFleet && record.status !== 'settled' && record.status !== 'voided' ? (
                  <button
                    type="button"
                    onClick={() => setSettleTarget(record)}
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
    </div>
  );
}

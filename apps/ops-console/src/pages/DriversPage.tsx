import { FormEvent, useEffect, useState } from 'react';

import { DeclareCashDialog, SettleCashDialog } from '../components/drivers/CashDialogs';
import { DriverCashLedgerPanel } from '../components/drivers/DriverCashLedgerPanel';
import { DriverRosterPanel } from '../components/drivers/DriverRosterPanel';
import { EMPTY_LEDGER, etb } from '../components/drivers/driverFormatting';
import { Dialog } from '../components/ui/Dialog';
import { MetricTile } from '../components/ui/MetricTile';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
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
import type { CashCollection, CashLedgerSummary, Driver, DriverShipment } from '../types/api';

/**
 * Driver roster and end-of-day cash position (NB-86).
 *
 * The operator question this page answers is asked twice a day and in two
 * directions: in the morning, *who is carrying what*, and at closing, *how much
 * cash is still out with drivers and how much never came back*. Both are cash
 * risk in this market, so they live on one surface rather than behind a filter.
 */

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
        eyebrow="Fleet"
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

      {error ? <p role="alert" className="rounded-md border border-[#e7c2be] bg-[#fff8f7] px-3 py-2 text-sm text-[#8f302a]">{error}</p> : null}

      <Panel
        eyebrow="Roster"
        title="Add a driver"
        description="The phone number is how you will recognise each driver, so please check it carefully."
      >
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" onSubmit={onCreateDriver}>
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

      <DriverRosterPanel
        drivers={drivers}
        loading={loading}
        canManageFleet={canManageFleet}
        van={van}
        onShowVan={(driver) => void onShowVan(driver)}
        onRequestDeactivate={setDeactivateTarget}
        onCloseVan={() => setVan(null)}
      />

      <DriverCashLedgerPanel
        collections={collections}
        ledger={ledger}
        loading={loading}
        canManageFleet={canManageFleet}
        onDeclare={setDeclareTarget}
        onSettle={setSettleTarget}
      />
    </div>
  );
}

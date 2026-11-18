import { FormEvent, useEffect, useState } from 'react';

import { Dialog } from '../components/ui/Dialog';
import { MetricTile } from '../components/ui/MetricTile';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { createShipment, listDrivers, listShipments, updateShipmentStatus } from '../services/logisticsApi';
import type { Driver, Shipment, ShipmentStatus } from '../types/api';
import { apiErrorMessage } from '../services/authErrors';

const statusTransitions: ShipmentStatus[] = ['in_transit', 'delayed', 'delivered', 'cancelled'];

function statusTone(status: ShipmentStatus) {
  if (status === 'delivered') return 'success';
  if (status === 'delayed' || status === 'cancelled') return 'danger';
  if (status === 'in_transit') return 'warning';
  return 'neutral';
}

/* ── Inline delay reason dialog ─────────────────────────────── */

function DelayReasonDialog({
  shipmentNo,
  defaultReason,
  onConfirm,
  onCancel,
}: {
  shipmentNo: string;
  defaultReason: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState(defaultReason);

  return (
    <Dialog
      eyebrow="Delay reason"
      title={`Mark ${shipmentNo} as delayed`}
      description="Add a short reason so the team knows what caused the delay."
      actions={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="glow-ring inline-flex min-h-8 items-center justify-center border border-[#cfd9d5] bg-white px-3 text-xs font-semibold text-[#40534c] transition hover:bg-[#eef3f0]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim()}
            className="glow-ring inline-flex min-h-8 items-center justify-center bg-[#087f72] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#06675d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Confirm delay
          </button>
        </>
      }
    >
      <textarea
        autoFocus
        className="fp-input min-h-24 px-4 py-3"
        placeholder="Describe the delay reason..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
    </Dialog>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton ${className ?? ''}`} />;
}

/**
 * NB-86: the delivery confirmation and its cash figure are captured together,
 * because a driver who never makes a second call must still produce a complete
 * cash record. A non-COD shipment records the delivery only.
 */
function DeliveryCashDialog({
  shipment,
  onConfirm,
  onCancel,
}: {
  shipment: Shipment;
  onConfirm: (cashCollected: number | undefined, note: string) => void;
  onCancel: () => void;
}) {
  const expected = Number(shipment.cod_amount_etb ?? 0);
  const hasCod = expected > 0;
  const [collected, setCollected] = useState(String(shipment.cod_amount_etb ?? '0'));
  const [note, setNote] = useState('');

  const entered = Number(collected);
  const shortfall = Number.isFinite(entered) ? Math.max(0, expected - entered) : 0;

  return (
    <Dialog
      eyebrow="Delivery confirmation"
      title={`Deliver ${shipment.shipment_no}`}
      description={
        hasCod
          ? `Cash on delivery of ${expected.toFixed(2)} ETB is expected at the door. Enter what the driver actually collected — a shortfall is recorded, not hidden.`
          : 'This shipment carries no cash on delivery, so confirming records the delivery only.'
      }
      actions={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="glow-ring inline-flex min-h-8 items-center justify-center border border-[#cfd9d5] bg-white px-3 text-xs font-semibold text-[#40534c] transition hover:bg-[#eef3f0]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(hasCod ? entered : undefined, note)}
            disabled={hasCod && (!Number.isFinite(entered) || entered < 0)}
            className="glow-ring inline-flex min-h-8 items-center justify-center bg-[#087f72] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#06675d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Confirm delivery
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        {hasCod ? (
          <>
            <label className="grid gap-1.5 text-xs font-medium text-[#40534c]">
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
            <p className={`text-xs ${shortfall > 0 ? 'text-[#885100]' : 'text-[#63766f]'}`}>
              {shortfall > 0
                ? `Shortfall of ${shortfall.toFixed(2)} ETB will be recorded against this delivery.`
                : 'This clears the expected amount in full.'}
            </p>
          </>
        ) : null}
        <label className="grid gap-1.5 text-xs font-medium text-[#40534c]">
          Delivery note (optional)
          <textarea
            className="fp-input min-h-20 px-4 py-3"
            placeholder="Anything the office should know about this delivery..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </div>
    </Dialog>
  );
}

export function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [delayDialog, setDelayDialog] = useState<{ shipment: Shipment } | null>(null);
  const [deliveryDialog, setDeliveryDialog] = useState<{ shipment: Shipment } | null>(null);
  const [form, setForm] = useState({
    shipment_no: '',
    origin_warehouse_code: '',
    destination_warehouse_code: '',
    sku: '',
    quantity_units: 1,
    driver_id: '',
    cod_amount_etb: 0,
  });

  async function loadShipments() {
    try {
      setError(null);
      const rows = await listShipments();
      setShipments(rows);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load shipments'));
    } finally {
      setLoading(false);
    }
  }

  async function loadDrivers() {
    try {
      setDrivers(await listDrivers('active'));
    } catch {
      // The roster only feeds the assignment picker; a failure here must not
      // blank the shipment board.
      setDrivers([]);
    }
  }

  useEffect(() => {
    loadShipments();
    loadDrivers();
  }, []);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    try {
      setCreating(true);
      setError(null);
      await createShipment({
        shipment_no: form.shipment_no,
        origin_warehouse_code: form.origin_warehouse_code,
        destination_warehouse_code: form.destination_warehouse_code,
        sku: form.sku,
        quantity_units: form.quantity_units,
        driver_id: form.driver_id || null,
        cod_amount_etb: form.cod_amount_etb,
      });
      setForm({
        shipment_no: '',
        origin_warehouse_code: '',
        destination_warehouse_code: '',
        sku: '',
        quantity_units: 1,
        driver_id: '',
        cod_amount_etb: 0,
      });
      await loadShipments();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to create shipment'));
    } finally {
      setCreating(false);
    }
  }

  async function onStatusUpdate(shipment: Shipment, status: ShipmentStatus) {
    if (status === 'delayed') {
      setDelayDialog({ shipment });
      return;
    }
    if (status === 'delivered') {
      setDeliveryDialog({ shipment });
      return;
    }
    const payload: { status: ShipmentStatus; delay_reason?: string } = { status };
    try {
      setError(null);
      await updateShipmentStatus(shipment.id, payload);
      await loadShipments();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to update shipment status'));
    }
  }

  async function onDeliveryConfirm(cashCollected: number | undefined, note: string) {
    if (!deliveryDialog) return;
    try {
      setError(null);
      await updateShipmentStatus(deliveryDialog.shipment.id, {
        status: 'delivered',
        cash_collected_etb: cashCollected,
        cash_note: note || undefined,
      });
      await loadShipments();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to confirm the delivery'));
    } finally {
      setDeliveryDialog(null);
    }
  }

  async function onDelayConfirm(reason: string) {
    if (!delayDialog) return;
    try {
      setError(null);
      await updateShipmentStatus(delayDialog.shipment.id, { status: 'delayed', delay_reason: reason });
      await loadShipments();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to update shipment status'));
    } finally {
      setDelayDialog(null);
    }
  }

  const counts = {
    planned: shipments.filter((shipment) => shipment.status === 'planned').length,
    inTransit: shipments.filter((shipment) => shipment.status === 'in_transit').length,
    delayed: shipments.filter((shipment) => shipment.status === 'delayed').length,
    delivered: shipments.filter((shipment) => shipment.status === 'delivered').length,
  };

  return (
    <div className="space-y-4">
      {delayDialog ? (
        <DelayReasonDialog
          shipmentNo={delayDialog.shipment.shipment_no}
          defaultReason={delayDialog.shipment.delay_reason || 'Traffic delay'}
          onConfirm={onDelayConfirm}
          onCancel={() => setDelayDialog(null)}
        />
      ) : null}

      {deliveryDialog ? (
        <DeliveryCashDialog
          shipment={deliveryDialog.shipment}
          onConfirm={onDeliveryConfirm}
          onCancel={() => setDeliveryDialog(null)}
        />
      ) : null}

      <PageHeader
        eyebrow="Shipments"
        title="Track every delivery"
      description="See what is on the road, what is late, and what has arrived."
      />

      <div className="grid overflow-hidden rounded-lg border border-[#e5e4e0] bg-white sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-[#efeeea]">
        <MetricTile title="Planned" value={counts.planned} detail="Not started yet" tone="neutral" />
        <MetricTile title="On the way" value={counts.inTransit} detail="Currently moving" tone="info" />
        <MetricTile title="Late" value={counts.delayed} detail="Needs attention" tone={counts.delayed > 0 ? 'danger' : 'success'} />
        <MetricTile title="Delivered" value={counts.delivered} detail="Completed" tone="success" />
      </div>

      <Panel
          eyebrow="New shipment"
        title="Create a shipment"
        description="Add a shipment here when it was not created from an imported order."
      >
        <form className="grid grid-cols-1 gap-3 lg:grid-cols-5" onSubmit={onCreate}>
          <label className="grid gap-1.5 text-xs font-medium text-[#40534c]">
            Shipment No
            <input className="fp-input" placeholder="Shipment No" value={form.shipment_no} onChange={(e) => setForm((prev) => ({ ...prev, shipment_no: e.target.value }))} required />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-[#40534c]">
            Origin Code
            <input className="fp-input" placeholder="Origin Code" value={form.origin_warehouse_code} onChange={(e) => setForm((prev) => ({ ...prev, origin_warehouse_code: e.target.value.toUpperCase() }))} required />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-[#40534c]">
            Destination Code
            <input className="fp-input" placeholder="Destination Code" value={form.destination_warehouse_code} onChange={(e) => setForm((prev) => ({ ...prev, destination_warehouse_code: e.target.value.toUpperCase() }))} required />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-[#40534c]">
            SKU
            <input className="fp-input" placeholder="SKU" value={form.sku} onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value.toUpperCase() }))} required />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-[#40534c]">
            Quantity
            <input className="fp-input" type="number" min={1} value={form.quantity_units} onChange={(e) => setForm((prev) => ({ ...prev, quantity_units: Number(e.target.value) }))} required />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-[#40534c]">
            Driver
            <select className="fp-input" value={form.driver_id} onChange={(e) => setForm((prev) => ({ ...prev, driver_id: e.target.value }))}>
              <option value="">Unassigned</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name}
                  {driver.vehicle_plate ? ` · ${driver.vehicle_plate}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-[#40534c]">
            Cash on delivery (ETB)
            <input
              className="fp-input"
              type="number"
              min={0}
              step="0.01"
              value={form.cod_amount_etb}
              onChange={(e) => setForm((prev) => ({ ...prev, cod_amount_etb: Number(e.target.value) }))}
            />
          </label>
          <div className="flex justify-end lg:col-span-5">
            <button
              type="submit"
              disabled={creating}
              className="glow-ring inline-flex min-h-9 items-center justify-center gap-2 bg-[#087f72] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#06675d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? (
                <svg className="animate-spin-slow h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="50 20" /></svg>
              ) : null}
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Panel>

      <Panel
        eyebrow="All shipments"
        title="Shipment status"
        description="Update a shipment when its status changes."
      >
        {error ? <p role="alert" className="mb-3 border border-[#e7c2be] bg-[#fff8f7] px-3 py-2 text-sm text-[#8f302a]">{error}</p> : null}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <SkeletonBlock key={i} className="h-[120px]" />
            ))}
          </div>
        ) : null}

        <div className="space-y-3">
          {shipments.map((shipment) => (
            <article key={shipment.id} className="fp-row">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={shipment.status} tone={statusTone(shipment.status)} />
                    <span className="text-[10px] text-[#63766f]">{new Date(shipment.created_at).toLocaleString()}</span>
                  </div>
                  <h3 className="mt-1.5 text-sm font-semibold text-[#20372f]">{shipment.shipment_no}</h3>
                </div>
                <div className="text-right font-mono text-xs text-[#63766f] tabular-nums">
                  <p>{shipment.origin_warehouse_code} → {shipment.destination_warehouse_code}</p>
                  <p>{shipment.sku} · {shipment.quantity_units} units</p>
                  <p className={shipment.driver_name ? 'text-[#40534c]' : 'text-[#6b7d76]'}>
                    {shipment.driver_name || 'No driver assigned'}
                  </p>
                  {Number(shipment.cod_amount_etb ?? 0) > 0 ? (
                    <p className="text-[#885100]">COD {Number(shipment.cod_amount_etb).toFixed(2)} ETB</p>
                  ) : null}
                </div>
              </div>

              <p className="mt-1.5 text-xs leading-5 text-[#63766f]">
                {shipment.delay_reason ? `Delay note: ${shipment.delay_reason}` : 'No delay reason logged for this shipment.'}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {statusTransitions.map((status) => (
                  <button
                    key={status}
                    className="glow-ring min-h-8 border border-[#d7dfdc] bg-white px-2.5 text-[11px] font-semibold text-[#40534c] transition hover:bg-[#eef3f0] disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => onStatusUpdate(shipment, status)}
                    disabled={shipment.status === status}
                  >
                    Mark {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </article>
          ))}

          {!loading && shipments.length === 0 ? (
            <div className="border border-dashed border-[#c8d4cf] bg-[#f8faf9] p-6 text-center">
              <p className="text-sm font-semibold text-[#40534c]">No shipments yet</p>
              <p className="mt-1 text-xs text-[#63766f]">Create your first shipment using the form above.</p>
            </div>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}

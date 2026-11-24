import { useEffect, useMemo, useRef, useState } from 'react';

import { Panel } from '../components/ui/Panel';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Dialog } from '../components/ui/Dialog';
import { useAuth } from '../context/AuthContext';
import { useLivePayloadStream } from '../hooks/useLiveUpdates';
import { apiErrorMessage } from '../services/authErrors';
import {
  closeDispatchCash,
  createCustomer,
  createCustomerTrackingLink,
  createDeliveryOrder,
  createDriver,
  createDriverLink,
  getDispatchRun,
  getProofBlob,
  listCustomers,
  listDeliveryOrders,
  listDispatchRuns,
  listDrivers,
  planFleetDispatch,
  planDispatchRun,
} from '../services/dispatchApi';
import type { Customer, DeliveryOrder, DispatchRun, Driver } from '../types/api';

const FIELD = 'fp-input min-h-10';

function isoOrUndefined(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

export function DispatchPage() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [runs, setRuns] = useState<DispatchRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [driverLink, setDriverLink] = useState<string | null>(null);
  const [customerTrackingLink, setCustomerTrackingLink] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [expandedRun, setExpandedRun] = useState<DispatchRun | null>(null);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [liveUpdatedAt, setLiveUpdatedAt] = useState<string | null>(null);
  const lastLiveVersion = useRef<string | null>(null);
  const [planMode, setPlanMode] = useState<'single' | 'fleet'>('single');
  const [fleetVehicleIds, setFleetVehicleIds] = useState<string[]>([]);
  const [fleetCapacities, setFleetCapacities] = useState<Record<string, string>>({});
  const [cashCloseTarget, setCashCloseTarget] = useState<DispatchRun | null>(null);
  const [closeCashError, setCloseCashError] = useState<string | null>(null);
  const [closingCash, setClosingCash] = useState(false);
  const [cashCloseForm, setCashCloseForm] = useState({
    handed_over_etb: '',
    deposit_bank: '' as '' | 'cbe' | 'dashen',
    deposit_reference: '',
    note: '',
  });

  const [customerForm, setCustomerForm] = useState({
    code: '',
    name: '',
    phone: '',
    address: '',
    latitude: '9.03',
    longitude: '38.74',
  });
  const [orderForm, setOrderForm] = useState({
    order_no: '',
    customer_id: '',
    quantity_units: '10',
    cod_amount_etb: '0',
    priority: '3',
    service_minutes: '15',
    window_start: '',
    window_end: '',
  });
  const [driverForm, setDriverForm] = useState({
    full_name: '',
    phone: '',
    vehicle_plate: '',
  });
  const [planForm, setPlanForm] = useState({
    route_name: 'Customer dispatch',
    plan_date: today,
    start_label: 'Main depot',
    start_latitude: '9.03',
    start_longitude: '38.74',
    driver_id: '',
    vehicle_capacity_units: '100',
    max_stops: '100',
    average_speed_kmh: '30',
  });

  const plannedOrders = useMemo(() => orders.filter((order) => order.status === 'planned'), [orders]);

  async function refresh() {
    try {
      const [nextCustomers, nextOrders, nextDrivers, nextRuns] = await Promise.all([
        listCustomers(),
        listDeliveryOrders(),
        listDrivers(),
        listDispatchRuns(),
      ]);
      const activeDrivers = nextDrivers.filter((driver) => driver.status === 'active');
      setCustomers(nextCustomers);
      setOrders(nextOrders);
      setDrivers(activeDrivers);
      setRuns(nextRuns);
      const activeDriverIds = new Set(activeDrivers.map((driver) => driver.id));
      setFleetVehicleIds((current) => current.filter((id) => activeDriverIds.has(id)));
      setFleetCapacities((current) =>
        Object.fromEntries(
          activeDrivers.map((driver) => [driver.id, current[driver.id] ?? '100']),
        ),
      );
      if (expandedRunId) {
        void getDispatchRun(expandedRunId).then(setExpandedRun).catch(() => {
          setExpandedRun(null);
        });
      }
      setSelectedIds((current) => current.filter((id) => nextOrders.some((order) => order.id === id && order.status === 'planned')));
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load dispatch data.'));
    }
  }

  useEffect(() => {
    void refresh();
    // Initial load only; mutations and live dispatch updates trigger later refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLivePayloadStream((payload) => {
    const version = payload.dispatch_overview?.updated_at;
    if (!version || version === lastLiveVersion.current) return;
    lastLiveVersion.current = version;
    setLiveUpdatedAt(version);
    void refresh();
  });

  async function onCreateCustomer(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createCustomer({
        code: customerForm.code,
        name: customerForm.name,
        phone: customerForm.phone || undefined,
        address: customerForm.address,
        latitude: Number(customerForm.latitude),
        longitude: Number(customerForm.longitude),
      });
      setCustomerForm({ code: '', name: '', phone: '', address: '', latitude: '9.03', longitude: '38.74' });
      setNotice('Customer added.');
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not add customer.'));
    }
  }

  async function onCreateOrder(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createDeliveryOrder({
        order_no: orderForm.order_no,
        customer_id: orderForm.customer_id,
        quantity_units: Number(orderForm.quantity_units),
        cod_amount_etb: Number(orderForm.cod_amount_etb),
        priority: Number(orderForm.priority),
        service_minutes: Number(orderForm.service_minutes),
        window_start: isoOrUndefined(orderForm.window_start),
        window_end: isoOrUndefined(orderForm.window_end),
      });
      setOrderForm((current) => ({ ...current, order_no: '', cod_amount_etb: '0' }));
      setNotice('Delivery order added.');
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not add delivery order.'));
    }
  }

  async function onCreateDriver(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createDriver({
        full_name: driverForm.full_name,
        phone: driverForm.phone,
        vehicle_plate: driverForm.vehicle_plate || undefined,
      });
      setDriverForm({ full_name: '', phone: '', vehicle_plate: '' });
      setNotice('Driver added.');
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not add driver.'));
    }
  }

  async function onPlan(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (selectedIds.length === 0) {
      setError('Select at least one planned delivery order.');
      return;
    }
    try {
      if (planMode === 'fleet') {
        if (fleetVehicleIds.length === 0) {
          setError('Select at least one driver for the fleet plan.');
          return;
        }
        const result = await planFleetDispatch({
          route_name: planForm.route_name,
          plan_date: planForm.plan_date,
          start_label: planForm.start_label,
          start_latitude: Number(planForm.start_latitude),
          start_longitude: Number(planForm.start_longitude),
          order_ids: selectedIds,
          vehicles: fleetVehicleIds.map((driverId) => ({
            driver_id: driverId,
            vehicle_capacity_units: Number(fleetCapacities[driverId] || '100'),
            max_stops: Number(planForm.max_stops),
            average_speed_kmh: Number(planForm.average_speed_kmh),
          })),
        });
        const unassignedCount = result.unassigned.length;
        setNotice(
          `Planned ${result.runs.length} vehicle run(s)` +
            (unassignedCount > 0
              ? `; ${unassignedCount} order(s) remain unassigned.`
              : '.'),
        );
        setSelectedIds([]);
        await refresh();
        return;
      }
      const run = await planDispatchRun({
        route_name: planForm.route_name,
        plan_date: planForm.plan_date,
        start_label: planForm.start_label,
        start_latitude: Number(planForm.start_latitude),
        start_longitude: Number(planForm.start_longitude),
        order_ids: selectedIds,
        driver_id: planForm.driver_id || undefined,
        vehicle_capacity_units: Number(planForm.vehicle_capacity_units),
        max_stops: Number(planForm.max_stops),
        average_speed_kmh: Number(planForm.average_speed_kmh),
      });
      const unassignedCount = run.unassigned?.length ?? 0;
      setNotice(
        `Planned ${run.stops?.length ?? 0} customer stops` +
          (unassignedCount > 0 ? `; ${unassignedCount} order(s) remain unassigned.` : '.'),
      );
      setSelectedIds([]);
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not plan this dispatch run.'));
    }
  }

  async function onDriverLink(runId: string) {
    setError(null);
    try {
      const link = await createDriverLink(runId);
      setDriverLink(link.driver_url);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create the driver link.'));
    }
  }

  async function onCustomerTrackingLink(orderId: string) {
    setError(null);
    try {
      const link = await createCustomerTrackingLink(orderId);
      setCustomerTrackingLink(link.tracking_url);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create the customer tracking link.'));
    }
  }

  function openCashClose(run: DispatchRun) {
    setCashCloseForm({
      handed_over_etb: run.cash_declared_etb ?? run.expected_cash_etb,
      deposit_bank: '',
      deposit_reference: '',
      note: '',
    });
    setCashCloseTarget(run);
    setCloseCashError(null);
  }

  async function onCloseCash(event: React.FormEvent) {
    event.preventDefault();
    if (!cashCloseTarget) return;
    const handedOver = Number(cashCloseForm.handed_over_etb);
    const expected = Number(cashCloseTarget.expected_cash_etb);
    if (!Number.isFinite(handedOver) || handedOver < 0) {
      setCloseCashError('Enter the amount of cash actually handed over.');
      return;
    }
    if (handedOver !== expected && !cashCloseForm.note.trim()) {
      setCloseCashError('Explain why the handed-over amount differs from the expected cash.');
      return;
    }
    setCloseCashError(null);
    setClosingCash(true);
    try {
      const result = await closeDispatchCash(cashCloseTarget.id, {
        handed_over_etb: handedOver.toFixed(2),
        deposit_bank: cashCloseForm.deposit_bank || undefined,
        deposit_reference: cashCloseForm.deposit_reference.trim() || undefined,
        note: cashCloseForm.note.trim() || undefined,
      });
      setNotice(
        `Cash recorded. Short by ${result.shortfall_etb} ETB. Over by ${result.overage_etb} ETB.`,
      );
      setCashCloseTarget(null);
      await refresh();
    } catch (err) {
      setCloseCashError(apiErrorMessage(err, 'Could not close cash for this run.'));
    } finally {
      setClosingCash(false);
    }
  }

  async function onToggleRun(runId: string) {
    if (expandedRunId === runId) {
      setExpandedRunId(null);
      setExpandedRun(null);
      return;
    }
    setExpandedRunId(runId);
    setExpandedRun(null);
    setExpandedLoading(true);
    try {
      setExpandedRun(await getDispatchRun(runId));
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load the dispatch stops.'));
    } finally {
      setExpandedLoading(false);
    }
  }

  async function onViewProof(orderId: string, proofId: string) {
    setError(null);
    try {
      const blob = await getProofBlob(orderId, proofId);
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) {
        throw new Error('Unexpected proof file type');
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener';
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not open the delivery proof.'));
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Dispatch"
        title="Dispatch deliveries"
        description="Add customers and orders, assign them to drivers, and record cash at the end of the day."
      />

      {error ? <p role="alert" className="rounded-md bg-[#fff8f7] p-3 text-sm text-[#8f302a]">{error}</p> : null}
      {notice ? <p role="status" className="rounded-md bg-[#f3faf7] p-3 text-sm text-[#14745f]">{notice}</p> : null}
      {driverLink ? (
        <div className="rounded-md bg-[#f3f9fc] p-3">
          <p className="text-xs font-semibold text-[#17679b]">Driver link created</p>
          <code className="mt-2 block break-all rounded-md border border-[#e5e4e0] bg-white p-2 text-[11px] text-[#252522]">{driverLink}</code>
        </div>
      ) : null}
      {customerTrackingLink ? (
        <div className="rounded-md bg-[#f3faf7] p-3">
          <p className="text-xs font-semibold text-[#14745f]">Customer tracking link created</p>
          <code className="mt-2 block break-all rounded-md border border-[#e5e4e0] bg-white p-2 text-[11px] text-[#252522]">{customerTrackingLink}</code>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel eyebrow="Customers" title="Customer" description="A customer is a named, mapped delivery location.">
          <form className="grid gap-3" onSubmit={onCreateCustomer}>
            <input className={FIELD} placeholder="Customer code" required value={customerForm.code} onChange={(event) => setCustomerForm({ ...customerForm, code: event.target.value })} />
            <input className={FIELD} placeholder="Customer name" required value={customerForm.name} onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })} />
            <input className={FIELD} placeholder="Phone (optional)" value={customerForm.phone} onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })} />
            <input className={FIELD} placeholder="Address" required value={customerForm.address} onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-xs text-[#454540]">
                <span>Latitude</span>
                <input className={FIELD} aria-label="Latitude" value={customerForm.latitude} onChange={(event) => setCustomerForm({ ...customerForm, latitude: event.target.value })} />
              </label>
              <label className="grid gap-1 text-xs text-[#454540]">
                <span>Longitude</span>
                <input className={FIELD} aria-label="Longitude" value={customerForm.longitude} onChange={(event) => setCustomerForm({ ...customerForm, longitude: event.target.value })} />
              </label>
            </div>
            <button type="submit" className="fp-action-primary w-full">Add customer</button>
          </form>
        </Panel>

        <Panel eyebrow="Orders" title="Delivery order" description="Demand, cash to collect, and optional time window.">
          <form className="grid gap-3" onSubmit={onCreateOrder}>
            <input className={FIELD} placeholder="Order number" required value={orderForm.order_no} onChange={(event) => setOrderForm({ ...orderForm, order_no: event.target.value })} />
            <select className={FIELD} aria-label="Customer" required value={orderForm.customer_id} onChange={(event) => setOrderForm({ ...orderForm, customer_id: event.target.value })}>
              <option value="">Select customer</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.code} · {customer.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-xs text-[#454540]">
                <span>Quantity units</span>
                <input className={FIELD} aria-label="Quantity units" type="number" min="1" value={orderForm.quantity_units} onChange={(event) => setOrderForm({ ...orderForm, quantity_units: event.target.value })} />
              </label>
              <label className="grid gap-1 text-xs text-[#454540]">
                <span>Cash on delivery (ETB)</span>
                <input className={FIELD} aria-label="Cash on delivery ETB" type="number" min="0" step="0.01" value={orderForm.cod_amount_etb} onChange={(event) => setOrderForm({ ...orderForm, cod_amount_etb: event.target.value })} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-xs text-[#454540]">
                <span>Priority (1–5)</span>
                <input className={FIELD} aria-label="Priority" type="number" min="1" max="5" value={orderForm.priority} onChange={(event) => setOrderForm({ ...orderForm, priority: event.target.value })} />
              </label>
              <label className="grid gap-1 text-xs text-[#454540]">
                <span>Service minutes</span>
                <input className={FIELD} aria-label="Service minutes" type="number" min="0" value={orderForm.service_minutes} onChange={(event) => setOrderForm({ ...orderForm, service_minutes: event.target.value })} />
              </label>
            </div>
            <div className="grid gap-2">
              <label htmlFor="order-window-start" className="text-xs text-[#5f5f59]">Window starts</label>
              <input id="order-window-start" className={FIELD} type="datetime-local" value={orderForm.window_start} onChange={(event) => setOrderForm({ ...orderForm, window_start: event.target.value })} />
              <label htmlFor="order-window-end" className="text-xs text-[#5f5f59]">Window ends</label>
              <input id="order-window-end" className={FIELD} type="datetime-local" value={orderForm.window_end} onChange={(event) => setOrderForm({ ...orderForm, window_end: event.target.value })} />
            </div>
            <button type="submit" className="fp-action-primary w-full">Add delivery order</button>
          </form>
        </Panel>

        <Panel eyebrow="Driver" title="Add a driver" description="The driver will receive a link to the delivery list.">
          <form className="grid gap-3" onSubmit={onCreateDriver}>
            <input className={FIELD} placeholder="Driver full name" required value={driverForm.full_name} onChange={(event) => setDriverForm({ ...driverForm, full_name: event.target.value })} />
            <input className={FIELD} placeholder="Phone" required value={driverForm.phone} onChange={(event) => setDriverForm({ ...driverForm, phone: event.target.value })} />
            <input className={FIELD} placeholder="Vehicle plate (optional)" value={driverForm.vehicle_plate} onChange={(event) => setDriverForm({ ...driverForm, vehicle_plate: event.target.value })} />
            <button type="submit" className="fp-action-primary w-full">Add driver</button>
          </form>
        </Panel>
      </div>

      <Panel
        eyebrow="Planning"
        title="Plan deliveries"
        description="Choose orders and drivers. The plan follows the delivery windows you entered."
      >
        <form className="grid gap-4" onSubmit={onPlan}>
          <div className="inline-flex w-fit rounded-lg bg-[#f1f1ef] p-0.5" role="group" aria-label="Planning mode">
            <button
              type="button"
              aria-pressed={planMode === 'single'}
              onClick={() => setPlanMode('single')}
              className={`min-h-8 rounded-md px-3 text-xs font-medium ${planMode === 'single' ? 'bg-white text-[#252522] shadow-sm' : 'text-[#73736e]'}`}
            >
              Single vehicle
            </button>
            <button
              type="button"
              aria-pressed={planMode === 'fleet'}
              onClick={() => setPlanMode('fleet')}
              className={`min-h-8 rounded-md px-3 text-xs font-medium ${planMode === 'fleet' ? 'bg-white text-[#252522] shadow-sm' : 'text-[#73736e]'}`}
            >
              Fleet plan
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-xs text-[#454540]">
              <span>Route name</span>
              <input className={FIELD} aria-label="Route name" required value={planForm.route_name} onChange={(event) => setPlanForm({ ...planForm, route_name: event.target.value })} />
            </label>
            <label className="grid gap-1 text-xs text-[#454540]">
              <span>Plan date</span>
              <input className={FIELD} aria-label="Plan date" type="date" required value={planForm.plan_date} onChange={(event) => setPlanForm({ ...planForm, plan_date: event.target.value })} />
            </label>
            {planMode === 'single' ? (
              <label className="grid gap-1 text-xs text-[#454540]">
                <span>Driver</span>
                <select className={FIELD} aria-label="Driver" value={planForm.driver_id} onChange={(event) => setPlanForm({ ...planForm, driver_id: event.target.value })}>
                  <option value="">No driver yet</option>
                  {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.full_name} · {driver.phone}</option>)}
                </select>
              </label>
            ) : null}
            <label className="grid gap-1 text-xs text-[#454540]">
              <span>Start label</span>
              <input className={FIELD} aria-label="Start label" required value={planForm.start_label} onChange={(event) => setPlanForm({ ...planForm, start_label: event.target.value })} />
            </label>
            <label className="grid gap-1 text-xs text-[#454540]">
              <span>Start latitude</span>
              <input className={FIELD} aria-label="Start latitude" value={planForm.start_latitude} onChange={(event) => setPlanForm({ ...planForm, start_latitude: event.target.value })} />
            </label>
            <label className="grid gap-1 text-xs text-[#454540]">
              <span>Start longitude</span>
              <input className={FIELD} aria-label="Start longitude" value={planForm.start_longitude} onChange={(event) => setPlanForm({ ...planForm, start_longitude: event.target.value })} />
            </label>
            {planMode === 'single' ? (
              <label className="grid gap-1 text-xs text-[#454540]">
                <span>Vehicle capacity</span>
                <input className={FIELD} aria-label="Vehicle capacity" type="number" min="1" value={planForm.vehicle_capacity_units} onChange={(event) => setPlanForm({ ...planForm, vehicle_capacity_units: event.target.value })} />
              </label>
            ) : null}
            <label className="grid gap-1 text-xs text-[#454540]">
              <span>Average speed (km/h)</span>
              <input className={FIELD} aria-label="Average speed" type="number" min="1" value={planForm.average_speed_kmh} onChange={(event) => setPlanForm({ ...planForm, average_speed_kmh: event.target.value })} />
            </label>
            <label className="grid gap-1 text-xs text-[#454540]">
              <span>{planMode === 'fleet' ? 'Max stops per vehicle' : 'Max stops'}</span>
              <input className={FIELD} aria-label={planMode === 'fleet' ? 'Max stops per vehicle' : 'Max stops'} type="number" min="1" max="100" value={planForm.max_stops} onChange={(event) => setPlanForm({ ...planForm, max_stops: event.target.value })} />
            </label>
          </div>
          {planMode === 'fleet' ? (
            <div className="space-y-2 border-t border-[#e5e4e0] pt-3">
              <p className="text-xs font-semibold text-[#252522]">Drivers and vehicle capacity</p>
              {drivers.length === 0 ? (
                <p className="text-xs text-[#73736e]">No active drivers available.</p>
              ) : null}
              {drivers.map((driver) => {
                const selected = fleetVehicleIds.includes(driver.id);
                return (
                  <div key={driver.id} className="grid items-center gap-3 border-t border-[#efeeea] px-1 py-2 first:border-t-0 sm:grid-cols-[1fr_160px]">
                    <label className="flex items-center gap-3 text-xs text-[#454540]">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) =>
                          setFleetVehicleIds((current) =>
                            event.target.checked
                              ? [...current, driver.id]
                              : current.filter((id) => id !== driver.id),
                          )
                        }
                      />
                      <span>{driver.full_name} · {driver.phone}</span>
                    </label>
                    <input
                      className={FIELD}
                      aria-label={`${driver.full_name} vehicle capacity`}
                      type="number"
                      min="1"
                      disabled={!selected}
                      value={fleetCapacities[driver.id] ?? '100'}
                      onChange={(event) =>
                        setFleetCapacities((current) => ({
                          ...current,
                          [driver.id]: event.target.value,
                        }))
                      }
                    />
                  </div>
                );
              })}
            </div>
          ) : null}
          <div className="border-t border-[#e5e4e0] pt-3">
            <p className="text-xs font-semibold text-[#252522]">Planned orders</p>
            {plannedOrders.length === 0 ? <p className="mt-2 text-xs text-[#73736e]">No planned orders yet.</p> : null}
            <div className="mt-2 grid gap-2">
              {plannedOrders.map((order) => (
                <label key={order.id} className="flex items-center gap-3 border-t border-[#efeeea] px-1 py-2 text-xs text-[#454540] first:border-t-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(order.id)}
                    onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, order.id] : current.filter((id) => id !== order.id))}
                  />
                  {order.order_no} · {order.customer_name} · {order.quantity_units} units · {order.cod_amount_etb} ETB
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="fp-action-primary w-fit">
            {planMode === 'fleet' ? 'Plan across selected vehicles' : 'Plan selected orders'}
          </button>
        </form>
      </Panel>

      <Panel eyebrow="Runs" title="Dispatch runs" description="Open a driver link, monitor stop status, or close the day’s cash.">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 text-xs" aria-live="polite">
            <span className="flex items-center gap-2 text-[#5f5f59]">
              <span className={`h-2 w-2 rounded-full ${liveUpdatedAt ? 'bg-[#16856b]' : 'bg-[#a8a7a1]'}`} />
              {liveUpdatedAt ? 'Live dispatch sync' : 'Waiting for live dispatch updates'}
            </span>
            {liveUpdatedAt ? (
              <span className="text-[#73736e]">
                {new Date(liveUpdatedAt).toLocaleTimeString()}
              </span>
            ) : null}
          </div>
          {runs.length === 0 ? <p className="text-xs text-[#73736e]">No dispatch runs yet.</p> : null}
          {runs.map((run) => (
            <article key={run.id} className="border-b border-[#e5e4e0] pb-3 last:border-b-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#252522]">{run.route_name}</h3>
                    <StatusBadge label={run.status} tone={run.status === 'closed' ? 'success' : 'info'} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#5f5f59]">
                    {run.plan_date} · {run.total_distance_km} km · {run.estimated_duration_min} min · {run.expected_cash_etb} ETB expected
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void onToggleRun(run.id)} className="fp-action-secondary !min-h-8 text-xs">
                    {expandedRunId === run.id ? 'Hide stops' : 'View stops'}
                  </button>
                  {run.driver_id ? <button type="button" onClick={() => void onDriverLink(run.id)} className="fp-action-quiet !min-h-8 !text-[#17679b]">Create driver link</button> : null}
                  {run.status !== 'closed' && (user?.role === 'admin' || user?.role === 'owner') ? <button type="button" onClick={() => openCashClose(run)} className="fp-action-quiet !min-h-8 !text-[#14745f]">Close cash</button> : null}
                </div>
              </div>
              {expandedRunId === run.id ? (
                <div className="mt-3 space-y-2 border-t border-[#efeeea] pt-3">
                  {expandedLoading ? <p className="text-xs text-[#73736e]">Loading stops…</p> : null}
                  {expandedRun?.stops?.map((stop) => (
                    <div key={stop.order_id} className="flex flex-wrap items-center justify-between gap-2 border-t border-[#efeeea] px-1 py-2 first:border-t-0">
                      <div>
                        <p className="text-xs text-[#252522]">#{stop.sequence} · {stop.order_no} · {stop.customer_name}</p>
                        <p className="text-[11px] text-[#5f5f59]">
                          {stop.status.replace(/_/g, ' ')} · {stop.collected_cash_etb} ETB collected · window{' '}
                          {stop.window_start ? new Date(stop.window_start).toLocaleTimeString() : '—'}
                          {' – '}
                          {stop.window_end ? new Date(stop.window_end).toLocaleTimeString() : '—'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => void onCustomerTrackingLink(stop.order_id)} className="fp-action-quiet !min-h-8 !text-[#14745f]">
                          Customer link
                        </button>
                        {stop.proof_id ? (
                          <button type="button" onClick={() => void onViewProof(stop.order_id, stop.proof_id!)} className="fp-action-quiet !min-h-8 !text-[#17679b]">
                            View proof
                          </button>
                        ) : <span className="text-[10px] text-[#73736e]">No proof</span>}
                      </div>
                    </div>
                  ))}
                  {expandedRun && expandedRun.stops?.length === 0 ? <p className="text-xs text-[#73736e]">No stops recorded.</p> : null}
                  {expandedRun?.unassigned && expandedRun.unassigned.length > 0 ? (
                    <div className="rounded-md bg-[#fffaf0] p-3">
                      <p className="text-xs font-semibold text-[#885100]">
                        Unassigned to this run
                      </p>
                      <ul className="mt-1 space-y-1 text-[11px] text-[#704500]">
                        {expandedRun.unassigned.map((item) => (
                          <li key={item.order_id}>{item.order_no}: {item.reason}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </Panel>

      {cashCloseTarget ? (
        <Dialog
          eyebrow="Cash handover"
          title="Close driver cash"
          description="Record what the office actually received and attach the bank deposit reference when available."
          onClose={() => { if (!closingCash) setCashCloseTarget(null); }}
        >
          <form className="grid gap-3" onSubmit={onCloseCash}>
            {closeCashError ? (
              <p role="alert" className="rounded-md border border-[#e7c2be] bg-[#fff8f7] px-3 py-2 text-xs text-[#8f302a]">
                {closeCashError}
              </p>
            ) : null}
            <div className="rounded-md bg-[#f7f7f5] px-3 py-2 text-xs text-[#454540]">
              Expected: <span className="font-semibold text-[#252522]">{cashCloseTarget.expected_cash_etb} ETB</span>
              {cashCloseTarget.cash_declared_etb ? (
                <span className="ml-3 text-[#5f5f59]">Declared: {cashCloseTarget.cash_declared_etb} ETB</span>
              ) : null}
            </div>
            <label className="grid gap-1 text-xs text-[#454540]">
              Cash handed over
              <input
                className={FIELD}
                type="number"
                min="0"
                step="0.01"
                required
                value={cashCloseForm.handed_over_etb}
                onChange={(event) =>
                  setCashCloseForm((current) => ({
                    ...current,
                    handed_over_etb: event.target.value,
                  }))
                }
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-[#454540]">
                Deposit bank
                <select
                  className={FIELD}
                  value={cashCloseForm.deposit_bank}
                  onChange={(event) =>
                    setCashCloseForm((current) => ({
                      ...current,
                      deposit_bank: event.target.value as '' | 'cbe' | 'dashen',
                    }))
                  }
                >
                  <option value="">No deposit slip</option>
                  <option value="cbe">CBE</option>
                  <option value="dashen">Dashen</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs text-[#454540]">
                Deposit reference
                <input
                  className={FIELD}
                  maxLength={128}
                  disabled={!cashCloseForm.deposit_bank}
                  value={cashCloseForm.deposit_reference}
                  onChange={(event) =>
                    setCashCloseForm((current) => ({
                      ...current,
                      deposit_reference: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <label className="grid gap-1 text-xs text-[#454540]">
              Close note
              <textarea
                className={`${FIELD} min-h-24 py-3`}
                maxLength={500}
                value={cashCloseForm.note}
                onChange={(event) =>
                  setCashCloseForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
              />
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={closingCash}
                onClick={() => setCashCloseTarget(null)}
                className="fp-action-secondary !min-h-8 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={closingCash}
                className="fp-action-primary !min-h-8 text-xs"
              >
                {closingCash ? 'Closing...' : 'Close cash'}
              </button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </div>
  );
}

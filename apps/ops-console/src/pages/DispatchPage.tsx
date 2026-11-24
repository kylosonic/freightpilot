import { useEffect, useMemo, useRef, useState } from 'react';

import { CloseCashDialog } from '../components/dispatch/CloseCashDialog';
import type { CashCloseFormState } from '../components/dispatch/CloseCashDialog';
import { DispatchPlanForm } from '../components/dispatch/DispatchPlanForm';
import type { DispatchPlanFormState } from '../components/dispatch/DispatchPlanForm';
import { DispatchRunsList } from '../components/dispatch/DispatchRunsList';
import { DispatchSetupForms } from '../components/dispatch/DispatchSetupForms';
import type {
  CustomerFormState,
  DeliveryOrderFormState,
  DispatchDriverFormState,
} from '../components/dispatch/DispatchSetupForms';
import { PageHeader } from '../components/ui/PageHeader';
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
  planDispatchRun,
  planFleetDispatch,
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
  const [cashCloseForm, setCashCloseForm] = useState<CashCloseFormState>({
    handed_over_etb: '',
    deposit_bank: '',
    deposit_reference: '',
    note: '',
  });

  const [customerForm, setCustomerForm] = useState<CustomerFormState>({
    code: '',
    name: '',
    phone: '',
    address: '',
    latitude: '9.03',
    longitude: '38.74',
  });
  const [orderForm, setOrderForm] = useState<DeliveryOrderFormState>({
    order_no: '',
    customer_id: '',
    quantity_units: '10',
    cod_amount_etb: '0',
    priority: '3',
    service_minutes: '15',
    window_start: '',
    window_end: '',
  });
  const [driverForm, setDriverForm] = useState<DispatchDriverFormState>({
    full_name: '',
    phone: '',
    vehicle_plate: '',
  });
  const [planForm, setPlanForm] = useState<DispatchPlanFormState>({
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

      <DispatchSetupForms
        fieldClassName={FIELD}
        customers={customers}
        customerForm={customerForm}
        onCustomerFormChange={setCustomerForm}
        onCreateCustomer={(event) => void onCreateCustomer(event)}
        orderForm={orderForm}
        onOrderFormChange={setOrderForm}
        onCreateOrder={(event) => void onCreateOrder(event)}
        driverForm={driverForm}
        onDriverFormChange={setDriverForm}
        onCreateDriver={(event) => void onCreateDriver(event)}
      />

      <DispatchPlanForm
        fieldClassName={FIELD}
        planMode={planMode}
        onPlanModeChange={setPlanMode}
        planForm={planForm}
        onPlanFormChange={setPlanForm}
        drivers={drivers}
        fleetVehicleIds={fleetVehicleIds}
        onToggleFleetVehicle={(driverId, checked) =>
          setFleetVehicleIds((current) =>
            checked ? [...current, driverId] : current.filter((id) => id !== driverId),
          )
        }
        fleetCapacities={fleetCapacities}
        onFleetCapacityChange={(driverId, value) =>
          setFleetCapacities((current) => ({ ...current, [driverId]: value }))
        }
        plannedOrders={plannedOrders}
        selectedIds={selectedIds}
        onToggleSelectedOrder={(orderId, checked) =>
          setSelectedIds((current) =>
            checked ? [...current, orderId] : current.filter((id) => id !== orderId),
          )
        }
        onSubmit={(event) => void onPlan(event)}
      />

      <DispatchRunsList
        liveUpdatedAt={liveUpdatedAt}
        runs={runs}
        canCloseCash={user?.role === 'admin' || user?.role === 'owner'}
        expandedRunId={expandedRunId}
        expandedRun={expandedRun}
        expandedLoading={expandedLoading}
        onToggleRun={(runId) => void onToggleRun(runId)}
        onDriverLink={(runId) => void onDriverLink(runId)}
        onOpenCashClose={openCashClose}
        onCustomerTrackingLink={(orderId) => void onCustomerTrackingLink(orderId)}
        onViewProof={(orderId, proofId) => void onViewProof(orderId, proofId)}
      />

      {cashCloseTarget ? (
        <CloseCashDialog
          fieldClassName={FIELD}
          target={cashCloseTarget}
          form={cashCloseForm}
          onFormChange={setCashCloseForm}
          error={closeCashError}
          busy={closingCash}
          onClose={() => setCashCloseTarget(null)}
          onSubmit={(event) => void onCloseCash(event)}
        />
      ) : null}
    </div>
  );
}

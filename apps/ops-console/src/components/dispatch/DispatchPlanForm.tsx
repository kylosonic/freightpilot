import type { FormEvent } from 'react';

import type { DeliveryOrder, Driver } from '../../types/api';
import { Panel } from '../ui/Panel';

export type DispatchPlanFormState = {
  route_name: string;
  plan_date: string;
  start_label: string;
  start_latitude: string;
  start_longitude: string;
  driver_id: string;
  vehicle_capacity_units: string;
  max_stops: string;
  average_speed_kmh: string;
};

type DispatchPlanFormProps = {
  fieldClassName: string;
  planMode: 'single' | 'fleet';
  onPlanModeChange: (mode: 'single' | 'fleet') => void;
  planForm: DispatchPlanFormState;
  onPlanFormChange: (next: DispatchPlanFormState) => void;
  drivers: Driver[];
  fleetVehicleIds: string[];
  onToggleFleetVehicle: (driverId: string, checked: boolean) => void;
  fleetCapacities: Record<string, string>;
  onFleetCapacityChange: (driverId: string, value: string) => void;
  plannedOrders: DeliveryOrder[];
  selectedIds: string[];
  onToggleSelectedOrder: (orderId: string, checked: boolean) => void;
  onSubmit: (event: FormEvent) => void;
};

export function DispatchPlanForm({
  fieldClassName,
  planMode,
  onPlanModeChange,
  planForm,
  onPlanFormChange,
  drivers,
  fleetVehicleIds,
  onToggleFleetVehicle,
  fleetCapacities,
  onFleetCapacityChange,
  plannedOrders,
  selectedIds,
  onToggleSelectedOrder,
  onSubmit,
}: DispatchPlanFormProps) {
  return (
    <Panel
      eyebrow="Planning"
      title="Plan deliveries"
      description="Choose orders and drivers. The plan follows the delivery windows you entered."
    >
      <form className="grid gap-4" onSubmit={onSubmit}>
        <div className="inline-flex w-fit rounded-lg bg-[#f1f1ef] p-0.5" role="group" aria-label="Planning mode">
          <button
            type="button"
            aria-pressed={planMode === 'single'}
            onClick={() => onPlanModeChange('single')}
            className={`min-h-8 rounded-md px-3 text-xs font-medium ${planMode === 'single' ? 'bg-white text-[#252522] shadow-sm' : 'text-[#73736e]'}`}
          >
            Single vehicle
          </button>
          <button
            type="button"
            aria-pressed={planMode === 'fleet'}
            onClick={() => onPlanModeChange('fleet')}
            className={`min-h-8 rounded-md px-3 text-xs font-medium ${planMode === 'fleet' ? 'bg-white text-[#252522] shadow-sm' : 'text-[#73736e]'}`}
          >
            Fleet plan
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-xs text-[#454540]">
            <span>Route name</span>
            <input className={fieldClassName} aria-label="Route name" required value={planForm.route_name} onChange={(event) => onPlanFormChange({ ...planForm, route_name: event.target.value })} />
          </label>
          <label className="grid gap-1 text-xs text-[#454540]">
            <span>Plan date</span>
            <input className={fieldClassName} aria-label="Plan date" type="date" required value={planForm.plan_date} onChange={(event) => onPlanFormChange({ ...planForm, plan_date: event.target.value })} />
          </label>
          {planMode === 'single' ? (
            <label className="grid gap-1 text-xs text-[#454540]">
              <span>Driver</span>
              <select className={fieldClassName} aria-label="Driver" value={planForm.driver_id} onChange={(event) => onPlanFormChange({ ...planForm, driver_id: event.target.value })}>
                <option value="">No driver yet</option>
                {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.full_name} · {driver.phone}</option>)}
              </select>
            </label>
          ) : null}
          <label className="grid gap-1 text-xs text-[#454540]">
            <span>Start label</span>
            <input className={fieldClassName} aria-label="Start label" required value={planForm.start_label} onChange={(event) => onPlanFormChange({ ...planForm, start_label: event.target.value })} />
          </label>
          <label className="grid gap-1 text-xs text-[#454540]">
            <span>Start latitude</span>
            <input className={fieldClassName} aria-label="Start latitude" value={planForm.start_latitude} onChange={(event) => onPlanFormChange({ ...planForm, start_latitude: event.target.value })} />
          </label>
          <label className="grid gap-1 text-xs text-[#454540]">
            <span>Start longitude</span>
            <input className={fieldClassName} aria-label="Start longitude" value={planForm.start_longitude} onChange={(event) => onPlanFormChange({ ...planForm, start_longitude: event.target.value })} />
          </label>
          {planMode === 'single' ? (
            <label className="grid gap-1 text-xs text-[#454540]">
              <span>Vehicle capacity</span>
              <input className={fieldClassName} aria-label="Vehicle capacity" type="number" min="1" value={planForm.vehicle_capacity_units} onChange={(event) => onPlanFormChange({ ...planForm, vehicle_capacity_units: event.target.value })} />
            </label>
          ) : null}
          <label className="grid gap-1 text-xs text-[#454540]">
            <span>Average speed (km/h)</span>
            <input className={fieldClassName} aria-label="Average speed" type="number" min="1" value={planForm.average_speed_kmh} onChange={(event) => onPlanFormChange({ ...planForm, average_speed_kmh: event.target.value })} />
          </label>
          <label className="grid gap-1 text-xs text-[#454540]">
            <span>{planMode === 'fleet' ? 'Max stops per vehicle' : 'Max stops'}</span>
            <input className={fieldClassName} aria-label={planMode === 'fleet' ? 'Max stops per vehicle' : 'Max stops'} type="number" min="1" max="100" value={planForm.max_stops} onChange={(event) => onPlanFormChange({ ...planForm, max_stops: event.target.value })} />
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
                      onChange={(event) => onToggleFleetVehicle(driver.id, event.target.checked)}
                    />
                    <span>{driver.full_name} · {driver.phone}</span>
                  </label>
                  <input
                    className={fieldClassName}
                    aria-label={`${driver.full_name} vehicle capacity`}
                    type="number"
                    min="1"
                    disabled={!selected}
                    value={fleetCapacities[driver.id] ?? '100'}
                    onChange={(event) => onFleetCapacityChange(driver.id, event.target.value)}
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
                  onChange={(event) => onToggleSelectedOrder(order.id, event.target.checked)}
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
  );
}

import type { FormEvent } from 'react';

import type { Customer } from '../../types/api';
import { Panel } from '../ui/Panel';

export type CustomerFormState = {
  code: string;
  name: string;
  phone: string;
  address: string;
  latitude: string;
  longitude: string;
};

export type DeliveryOrderFormState = {
  order_no: string;
  customer_id: string;
  quantity_units: string;
  cod_amount_etb: string;
  priority: string;
  service_minutes: string;
  window_start: string;
  window_end: string;
};

export type DispatchDriverFormState = {
  full_name: string;
  phone: string;
  vehicle_plate: string;
};

type DispatchSetupFormsProps = {
  fieldClassName: string;
  customers: Customer[];
  customerForm: CustomerFormState;
  onCustomerFormChange: (next: CustomerFormState) => void;
  onCreateCustomer: (event: FormEvent) => void;
  orderForm: DeliveryOrderFormState;
  onOrderFormChange: (next: DeliveryOrderFormState) => void;
  onCreateOrder: (event: FormEvent) => void;
  driverForm: DispatchDriverFormState;
  onDriverFormChange: (next: DispatchDriverFormState) => void;
  onCreateDriver: (event: FormEvent) => void;
};

export function DispatchSetupForms({
  fieldClassName,
  customers,
  customerForm,
  onCustomerFormChange,
  onCreateCustomer,
  orderForm,
  onOrderFormChange,
  onCreateOrder,
  driverForm,
  onDriverFormChange,
  onCreateDriver,
}: DispatchSetupFormsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Panel eyebrow="Customers" title="Customer" description="A customer is a named, mapped delivery location.">
        <form className="grid gap-3" onSubmit={onCreateCustomer}>
          <input className={fieldClassName} placeholder="Customer code" required value={customerForm.code} onChange={(event) => onCustomerFormChange({ ...customerForm, code: event.target.value })} />
          <input className={fieldClassName} placeholder="Customer name" required value={customerForm.name} onChange={(event) => onCustomerFormChange({ ...customerForm, name: event.target.value })} />
          <input className={fieldClassName} placeholder="Phone (optional)" value={customerForm.phone} onChange={(event) => onCustomerFormChange({ ...customerForm, phone: event.target.value })} />
          <input className={fieldClassName} placeholder="Address" required value={customerForm.address} onChange={(event) => onCustomerFormChange({ ...customerForm, address: event.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs text-[#454540]">
              <span>Latitude</span>
              <input className={fieldClassName} aria-label="Latitude" value={customerForm.latitude} onChange={(event) => onCustomerFormChange({ ...customerForm, latitude: event.target.value })} />
            </label>
            <label className="grid gap-1 text-xs text-[#454540]">
              <span>Longitude</span>
              <input className={fieldClassName} aria-label="Longitude" value={customerForm.longitude} onChange={(event) => onCustomerFormChange({ ...customerForm, longitude: event.target.value })} />
            </label>
          </div>
          <button type="submit" className="fp-action-primary w-full">Add customer</button>
        </form>
      </Panel>

      <Panel eyebrow="Orders" title="Delivery order" description="Demand, cash to collect, and optional time window.">
        <form className="grid gap-3" onSubmit={onCreateOrder}>
          <input className={fieldClassName} placeholder="Order number" required value={orderForm.order_no} onChange={(event) => onOrderFormChange({ ...orderForm, order_no: event.target.value })} />
          <select className={fieldClassName} aria-label="Customer" required value={orderForm.customer_id} onChange={(event) => onOrderFormChange({ ...orderForm, customer_id: event.target.value })}>
            <option value="">Select customer</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.code} · {customer.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs text-[#454540]">
              <span>Quantity units</span>
              <input className={fieldClassName} aria-label="Quantity units" type="number" min="1" value={orderForm.quantity_units} onChange={(event) => onOrderFormChange({ ...orderForm, quantity_units: event.target.value })} />
            </label>
            <label className="grid gap-1 text-xs text-[#454540]">
              <span>Cash on delivery (ETB)</span>
              <input className={fieldClassName} aria-label="Cash on delivery ETB" type="number" min="0" step="0.01" value={orderForm.cod_amount_etb} onChange={(event) => onOrderFormChange({ ...orderForm, cod_amount_etb: event.target.value })} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs text-[#454540]">
              <span>Priority (1–5)</span>
              <input className={fieldClassName} aria-label="Priority" type="number" min="1" max="5" value={orderForm.priority} onChange={(event) => onOrderFormChange({ ...orderForm, priority: event.target.value })} />
            </label>
            <label className="grid gap-1 text-xs text-[#454540]">
              <span>Service minutes</span>
              <input className={fieldClassName} aria-label="Service minutes" type="number" min="0" value={orderForm.service_minutes} onChange={(event) => onOrderFormChange({ ...orderForm, service_minutes: event.target.value })} />
            </label>
          </div>
          <div className="grid gap-2">
            <label htmlFor="order-window-start" className="text-xs text-[#5f5f59]">Window starts</label>
            <input id="order-window-start" className={fieldClassName} type="datetime-local" value={orderForm.window_start} onChange={(event) => onOrderFormChange({ ...orderForm, window_start: event.target.value })} />
            <label htmlFor="order-window-end" className="text-xs text-[#5f5f59]">Window ends</label>
            <input id="order-window-end" className={fieldClassName} type="datetime-local" value={orderForm.window_end} onChange={(event) => onOrderFormChange({ ...orderForm, window_end: event.target.value })} />
          </div>
          <button type="submit" className="fp-action-primary w-full">Add delivery order</button>
        </form>
      </Panel>

      <Panel eyebrow="Driver" title="Add a driver" description="The driver will receive a link to the delivery list.">
        <form className="grid gap-3" onSubmit={onCreateDriver}>
          <input className={fieldClassName} placeholder="Driver full name" required value={driverForm.full_name} onChange={(event) => onDriverFormChange({ ...driverForm, full_name: event.target.value })} />
          <input className={fieldClassName} placeholder="Phone" required value={driverForm.phone} onChange={(event) => onDriverFormChange({ ...driverForm, phone: event.target.value })} />
          <input className={fieldClassName} placeholder="Vehicle plate (optional)" value={driverForm.vehicle_plate} onChange={(event) => onDriverFormChange({ ...driverForm, vehicle_plate: event.target.value })} />
          <button type="submit" className="fp-action-primary w-full">Add driver</button>
        </form>
      </Panel>
    </div>
  );
}

import type { ShipmentStatus } from './logistics';

// Driver roster and cash-on-delivery ledger.
//
// The question these answer, at the end of every working day in this market:
// *who is carrying the load, how much cash is still out with them, and how much
// never came back?* Money figures arrive as decimal strings — they are summed
// server-side, and parsing them into JS numbers here would lose the exact
// shortfall the operator is acting on.

export type DriverStatus = 'active' | 'inactive';

export type Driver = {
  id: string;
  created_at: string;
  full_name: string;
  phone: string;
  license_no: string | null;
  vehicle_plate: string | null;
  status: DriverStatus;
  notes: string | null;
};

export type DriverShipment = {
  id: string;
  created_at: string;
  shipment_no: string;
  status: ShipmentStatus;
  expected_delivery: string | null;
  cod_amount_etb: string;
};

export type CashCollectionStatus = 'outstanding' | 'collected' | 'settled' | 'voided';

export type CashCollection = {
  id: string;
  created_at: string;
  shipment_id: string;
  shipment_no: string;
  driver_id: string | null;
  driver_name: string | null;
  expected_etb: string;
  collected_etb: string;
  shortfall_etb: string;
  status: CashCollectionStatus;
  collected_at: string | null;
  settled_at: string | null;
  note: string | null;
};

export type CashLedgerSummary = {
  outstanding_count: number;
  outstanding_expected_etb: string;
  collected_count: number;
  collected_etb: string;
  settled_count: number;
  settled_etb: string;
  shortfall_etb: string;
};

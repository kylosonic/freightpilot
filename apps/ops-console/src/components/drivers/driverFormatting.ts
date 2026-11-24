import type { CashCollectionStatus, CashLedgerSummary, DriverStatus, ShipmentStatus } from '../../types/api';

export const EMPTY_LEDGER: CashLedgerSummary = {
  outstanding_count: 0,
  outstanding_expected_etb: '0.00',
  collected_count: 0,
  collected_etb: '0.00',
  settled_count: 0,
  settled_etb: '0.00',
  shortfall_etb: '0.00',
};

export function driverTone(status: DriverStatus) {
  return status === 'active' ? 'success' : 'neutral';
}

export function cashTone(status: CashCollectionStatus) {
  if (status === 'settled') return 'success';
  if (status === 'outstanding') return 'warning';
  if (status === 'voided') return 'danger';
  return 'info';
}

export function shipmentTone(status: ShipmentStatus) {
  if (status === 'delivered') return 'success';
  if (status === 'delayed' || status === 'cancelled') return 'danger';
  if (status === 'in_transit') return 'info';
  return 'neutral';
}

/** Money is summed as a decimal string on the server; this only formats it. */
export function etb(value: string | number | null | undefined): string {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return '0.00 ETB';
  return `${parsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;
}

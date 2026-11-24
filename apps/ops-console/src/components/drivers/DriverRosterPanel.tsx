import type { Driver, DriverShipment } from '../../types/api';
import { Panel } from '../ui/Panel';
import { StatusBadge } from '../ui/StatusBadge';
import { driverTone, etb, shipmentTone } from './driverFormatting';

type DriverRosterPanelProps = {
  drivers: Driver[];
  loading: boolean;
  canManageFleet: boolean;
  van: { driverName: string; shipments: DriverShipment[] } | null;
  onShowVan: (driver: Driver) => void;
  onRequestDeactivate: (driver: Driver) => void;
  onCloseVan: () => void;
};

export function DriverRosterPanel({
  drivers,
  loading,
  canManageFleet,
  van,
  onShowVan,
  onRequestDeactivate,
  onCloseVan,
}: DriverRosterPanelProps) {
  return (
    <>
      <Panel
        eyebrow="Roster"
        title="Who is on the fleet today"
        description="Choose a driver to see their current deliveries and cash."
      >
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="skeleton h-[96px]" />
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
                    onClick={() => onRequestDeactivate(driver)}
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
                  <StatusBadge label={shipment.status} tone={shipmentTone(shipment.status)} />
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
                onClick={onCloseVan}
                className="fp-action-secondary !min-h-8 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </Panel>
      ) : null}
    </>
  );
}

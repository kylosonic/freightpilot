import L, { type LatLngExpression } from 'leaflet';
import { useMemo } from 'react';
import { MapContainer, Marker, Polygon, Polyline, Popup, TileLayer } from 'react-leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import { Panel } from './ui/Panel';
import type { RouteStop, WeatherRiskZone } from '../types/api';

type Props = {
  stops: RouteStop[];
  riskZones?: WeatherRiskZone[];
};

const ADDIS_CENTER: LatLngExpression = [8.9806, 38.7578];

const defaultIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export function RouteMap({ stops, riskZones = [] }: Props) {
  const validStops = useMemo(
    () => stops.filter((s) => typeof s.latitude === 'number' && typeof s.longitude === 'number'),
    [stops],
  );
  const polyline: LatLngExpression[] = validStops.map((s) => [s.latitude as number, s.longitude as number]);

  const totalDistance = validStops.reduce((sum, s) => sum + (s.leg_distance_km ?? 0), 0);
  const totalDemand = validStops.reduce((sum, s) => sum + (s.demand_units ?? 0), 0);

  return (
    <Panel
      eyebrow="Map"
      title="See the route"
      description="Check the path and delivery stops before saving or dispatching."
    >
      <div className="relative h-[420px] overflow-hidden border border-[#d7dfdc]">
        {validStops.length === 0 ? (
          <div className="absolute inset-0 z-[500] grid place-items-center bg-[#f5f8f6]/95 text-center text-sm text-[#63766f]">
            <div className="max-w-xs space-y-3 px-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center border border-[#d7dfdc] bg-white">
                <svg className="h-6 w-6 text-[#63766f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[#20372f]">No mapped stops yet</p>
              <p>Plan a route with warehouse locations to see it here.</p>
            </div>
          </div>
        ) : null}

        <MapContainer center={polyline[0] ?? ADDIS_CENTER} zoom={11} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {validStops.map((stop) => (
            <Marker key={stop.sequence} icon={defaultIcon} position={[stop.latitude as number, stop.longitude as number]}>
              <Popup>
                <div>
                  <p className="font-semibold">
                    #{stop.sequence} {stop.warehouse_code}
                  </p>
                  <p>Demand: {stop.demand_units}</p>
                  <p>Leg: {stop.leg_distance_km} km</p>
                </div>
              </Popup>
            </Marker>
          ))}
          {riskZones.map((zone) => (
            <Polygon
              key={zone.id}
              positions={zone.polygon as LatLngExpression[]}
              pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.3 }}
            >
              <Popup>
                <div className="font-semibold">Weather Risk Zone</div>
                <div className="text-sm">Severity: {zone.severity_score}/10</div>
                <div className="text-xs text-[#63766f]">
                  {zone.source === 'simulated'
                    ? 'Simulated — not live weather'
                    : zone.source === 'live'
                      ? 'Live provider data'
                      : 'Weather source not declared'}
                </div>
              </Popup>
            </Polygon>
          ))}
          {polyline.length >= 2 ? <Polyline positions={polyline} color="#087f72" weight={4} /> : null}
        </MapContainer>
      </div>

      {validStops.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="border border-[#d7dfdc] bg-[#f7faf8] px-2.5 py-1 text-xs text-[#52665e]">
            <span className="font-mono font-semibold text-[#20372f]">{validStops.length}</span> stops
          </div>
          <div className="border border-[#d7dfdc] bg-[#f7faf8] px-2.5 py-1 text-xs text-[#52665e]">
            <span className="font-mono font-semibold text-[#20372f]">{totalDistance.toFixed(1)}</span> km total
          </div>
          <div className="border border-[#d7dfdc] bg-[#f7faf8] px-2.5 py-1 text-xs text-[#52665e]">
            <span className="font-mono font-semibold text-[#20372f]">{totalDemand.toLocaleString()}</span> units demand
          </div>
        </div>
      ) : null}
    </Panel>
  );
}


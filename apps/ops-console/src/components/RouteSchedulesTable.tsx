import { StatusBadge } from './ui/StatusBadge';
import type { RouteScheduleSummary } from '../types/api';

type Props = {
  schedules: RouteScheduleSummary[];
};

function scheduleTone(status: string) {
  if (status === 'completed' || status === 'delivered') return 'success';
  if (status === 'delayed' || status === 'failed') return 'danger';
  if (status === 'active' || status === 'in_progress') return 'warning';
  return 'neutral';
}

export function RouteSchedulesTable({ schedules }: Props) {
  return (
    <div className="overflow-x-auto border border-[#d7dfdc]">
      <table className="min-w-full divide-y divide-[#e2e8e5] text-sm">
        <thead className="bg-[#f5f8f6]">
          <tr>
            <th scope="col" className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#63766f]">Route</th>
            <th scope="col" className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#63766f]">Date</th>
            <th scope="col" className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[#63766f]">Distance (km)</th>
            <th scope="col" className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[#63766f]">Cost units</th>
            <th scope="col" className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[#63766f]">Duration (min)</th>
            <th scope="col" className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#63766f]">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e6ebe8] bg-white">
          {schedules.map((route) => (
            <tr key={route.id} className="transition-colors hover:bg-[#f7faf8]">
              <td className="px-3 py-2.5 font-medium text-[#20372f]">{route.route_name}</td>
              <td className="px-3 py-2.5 text-[#52665e]">{route.schedule_date}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[#40534c]">{route.total_distance_km}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[#40534c]">{route.total_cost.toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[#40534c]">{route.estimated_duration_min}</td>
              <td className="px-3 py-2.5">
                <StatusBadge label={route.status} tone={scheduleTone(route.status)} />
              </td>
            </tr>
          ))}
          {schedules.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-7 text-center text-xs text-[#63766f]">
                No route schedules saved yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}


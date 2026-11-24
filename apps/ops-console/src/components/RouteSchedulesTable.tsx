import { StatusBadge } from './ui/StatusBadge';
import type { RouteScheduleSummary } from '../types/api';

type Props = {
  schedules: RouteScheduleSummary[];
};

function scheduleTone(status: string) {
  if (status === 'completed' || status === 'delivered') return 'success';
  if (status === 'delayed' || status === 'failed') return 'danger';
  if (status === 'active' || status === 'in_progress') return 'info';
  return 'neutral';
}

const heading = 'px-3 py-2 text-[11px] font-medium text-[#73736e]';

export function RouteSchedulesTable({ schedules }: Props) {
  return (
    <div className="overflow-x-auto border-y border-[#e5e4e0]">
      <table className="min-w-full divide-y divide-[#e5e4e0] text-sm">
        <thead>
          <tr>
            <th scope="col" className={`${heading} text-left`}>Route</th>
            <th scope="col" className={`${heading} text-left`}>Date</th>
            <th scope="col" className={`${heading} text-right`}>Distance (km)</th>
            <th scope="col" className={`${heading} text-right`}>Cost units</th>
            <th scope="col" className={`${heading} text-right`}>Duration (min)</th>
            <th scope="col" className={`${heading} text-left`}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#efeeea] bg-white">
          {schedules.map((route) => (
            <tr key={route.id} className="transition-colors hover:bg-[#f7f7f5]">
              <td className="px-3 py-3 font-medium text-[#252522]">{route.route_name}</td>
              <td className="px-3 py-3 text-[#5f5f59]">{route.schedule_date}</td>
              <td className="px-3 py-3 text-right tabular-nums text-[#454540]">{route.total_distance_km}</td>
              <td className="px-3 py-3 text-right tabular-nums text-[#454540]">{route.total_cost.toLocaleString()}</td>
              <td className="px-3 py-3 text-right tabular-nums text-[#454540]">{route.estimated_duration_min}</td>
              <td className="px-3 py-2.5">
                <StatusBadge label={route.status} tone={scheduleTone(route.status)} />
              </td>
            </tr>
          ))}
          {schedules.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-7 text-center text-xs text-[#73736e]">
                No route schedules saved yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}


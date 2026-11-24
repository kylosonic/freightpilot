import type { DockAppointment } from '../services/logisticsApi';

interface Props {
  appointments: DockAppointment[];
}

export function DockGanttChart({ appointments }: Props) {
  // Simple visualization logic: assume a 12-hour window from 06:00 to 18:00
  // Each hour is 1/12th of the width.
  const chartStartHour = 6;
  const chartEndHour = 18;
  const totalHours = chartEndHour - chartStartHour;

  const getStyleForTime = (timeStr: string) => {
    const d = new Date(timeStr);
    const hour = d.getHours() + d.getMinutes() / 60;
    
    if (hour < chartStartHour) return { left: '0%', width: '0%' };
    if (hour > chartEndHour) return { left: '100%', width: '0%' };
    
    // Assume an appointment takes 1 hour for visualization
    const leftPct = ((hour - chartStartHour) / totalHours) * 100;
    const widthPct = (1 / totalHours) * 100;
    
    return {
      left: `${leftPct}%`,
      width: `${widthPct}%`,
    };
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-[#252522]">Dock capacity schedule</h3>
        <div className="flex gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-[#5f5f59]"><span className="inline-block h-2 w-2 rounded-sm bg-[#087f72]" aria-hidden="true" /> Scheduled</span>
          <span className="inline-flex items-center gap-1.5 text-[#5f5f59]"><span className="inline-block h-2 w-2 rounded-sm bg-[#a15b00]" aria-hidden="true" /> Rescheduled</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-x-auto rounded-md border border-[#e5e4e0] bg-[#f7f7f5]">
        <div className="relative min-h-[160px] min-w-[600px] p-4">
          <div className="absolute inset-0 flex justify-between px-4">
            {Array.from({ length: totalHours + 1 }).map((_, i) => (
              <div key={i} className="flex h-full flex-col items-center border-l border-[#e5e4e0]">
                <span className="mt-1 font-mono text-[10px] text-[#73736e]">{i + chartStartHour}:00</span>
              </div>
            ))}
          </div>

          <div className="relative z-10 mt-6 flex h-full flex-col gap-2 overflow-y-auto">
            {appointments.length === 0 ? (
              <div className="flex h-full items-center justify-center py-6 text-xs text-[#73736e]">No appointments scheduled</div>
            ) : (
              appointments.map((appt) => {
                const style = getStyleForTime(appt.scheduled_time);
                const isRescheduled = appt.status === 'rescheduled';
                return (
                  <div key={appt.id} className="relative h-8 w-full rounded bg-[#efeeea]">
                    <div
                      className={`absolute flex h-full items-center rounded-r border-l-2 px-2 text-[10px] font-semibold text-white ${isRescheduled ? 'border-l-[#6d3d00] bg-[#a15b00]' : 'border-l-[#05594f] bg-[#087f72]'}`}
                      style={style}
                      title={`Truck: ${appt.truck_id}\nStatus: ${appt.status}\nTime: ${new Date(appt.scheduled_time).toLocaleTimeString()}`}
                    >
                      <span className="truncate">{appt.truck_id}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

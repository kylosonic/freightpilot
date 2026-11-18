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
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[#20372f]">Dock capacity schedule</h3>
        <div className="flex gap-2 text-xs">
          <span className="flex items-center gap-1 text-[#52665e]"><div className="h-2 w-2 bg-[#087f72]" aria-hidden="true"></div> Scheduled</span>
          <span className="flex items-center gap-1 text-[#52665e]"><div className="h-2 w-2 bg-[#a15b00]" aria-hidden="true"></div> Rescheduled</span>
        </div>
      </div>
      
      <div className="relative flex-1 border border-[#e2e8e5] bg-[#f8faf9] p-4">
        <div className="absolute top-0 bottom-0 left-0 right-0 flex justify-between px-4">
          {Array.from({ length: totalHours + 1 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center border-l border-[#d7dfdc] h-full">
              <span className="mt-1 font-mono text-[10px] text-[#63766f]">{i + chartStartHour}:00</span>
            </div>
          ))}
        </div>
        
        <div className="relative z-10 mt-6 h-full flex flex-col gap-2 overflow-y-auto">
          {appointments.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-[#63766f]">No appointments scheduled</div>
          ) : (
            appointments.map((appt) => {
              const style = getStyleForTime(appt.scheduled_time);
              const isRescheduled = appt.status === 'rescheduled';
              return (
                <div key={appt.id} className="relative h-8 w-full bg-[#edf2ef]">
                  <div
                    className={`absolute flex h-full items-center border-l-2 px-2 text-[10px] font-semibold text-white ${isRescheduled ? 'border-l-[#6d3d00] bg-[#a15b00]' : 'border-l-[#05594f] bg-[#087f72]'}`}
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
  );
}

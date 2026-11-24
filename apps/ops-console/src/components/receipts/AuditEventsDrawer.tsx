import { useReceiptAuditEvents } from '../../hooks/queries';

export function AuditEventsDrawer({ receiptId }: { receiptId: string }) {
  const { data: events = [] } = useReceiptAuditEvents(receiptId);
  if (events.length === 0) {
    return <p className="text-xs text-[#73736e]">No history yet.</p>;
  }
  return (
    <div className="max-h-56 divide-y divide-[#efeeea] overflow-y-auto border-t border-[#efeeea]">
      {events.map((event) => (
        <div
          key={event.id}
          className="py-2.5 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono font-semibold text-[#17679b]">{event.event_type}</span>
            <span className="text-[11px] text-[#73736e]">
              {new Date(event.created_at).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-[#454540]">{event.description}</p>
          {event.available_actions.length > 0 ? (
            <p className="mt-1 text-[11px] text-[#73736e]">
              Allowed: {event.available_actions.join(', ')}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

import { useState } from 'react';

import { useVerifiedAudit } from '../../hooks/queries';
import type { VerifiedReceiptAudit } from '../../types/api';
import { Panel } from '../ui/Panel';
import { AuditEventsDrawer } from './AuditEventsDrawer';
import { ReversalActionButtons } from './ReversalActionButtons';

export function ReversalsPanel({
  onUndo,
  onReverse,
  onError,
}: {
  onUndo: (row: VerifiedReceiptAudit, note: string) => Promise<boolean>;
  onReverse: (row: VerifiedReceiptAudit, reason: string) => Promise<boolean>;
  onError: (message: string) => void;
}) {
  const { data: rows = [], refetch } = useVerifiedAudit();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Panel
      eyebrow="Payment history"
      title="Verified payments"
      description="You can undo a verified payment within 24 hours. After that, reversing it sends the customer a notice and requires a reason."
    >
      {rows.length === 0 ? (
        <p className="text-xs text-[#73736e]">No verified receipts.</p>
      ) : (
        <div className="grid gap-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="border-t border-[#efeeea] py-2.5 first:border-t-0 first:pt-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[#252522]">
                    {row.organization_name} · {row.reference_number ?? 'no ref'} ·{' '}
                    <span className="font-mono font-medium tabular-nums">{row.amount_etb ?? '—'}</span> ETB
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#5f5f59]">
                    Invoice {row.invoice_number ?? '—'} · decided{' '}
                    {row.decided_at ? new Date(row.decided_at).toLocaleString() : '—'}
                  </p>
                  {row.undo_available_until && row.undo_available ? (
                    <p className="mt-0.5 text-[10px] text-[#73736e]">
                      You can undo this until {new Date(row.undo_available_until).toLocaleString()}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ReversalActionButtons row={row} onUndo={onUndo} onReverse={onReverse} />
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    className="fp-action-secondary !min-h-7 !px-2 text-[10px]"
                  >
                    {expandedId === row.id ? 'Hide history' : 'View history'}
                  </button>
                </div>
              </div>
              {expandedId === row.id ? (
                <div className="mt-2 border-t border-[#efeeea] pt-2">
                  <AuditEventsDrawer receiptId={row.id} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          refetch();
          onError('');
        }}
        className="fp-action-secondary mt-3 !min-h-7 !px-2.5 text-[10px]"
      >
        Refresh history
      </button>
    </Panel>
  );
}

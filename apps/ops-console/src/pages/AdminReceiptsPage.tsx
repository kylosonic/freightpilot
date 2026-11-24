import { useState } from 'react';

import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ReceiptReviewDetailPane } from '../components/receipts/ReceiptReviewDetailPane';
import { ReversalsPanel } from '../components/receipts/ReversalsPanel';
import { REVERSED_CREDIT_CHIP, verdictTone } from '../components/receipts/receiptReviewConstants';
import {
  useReceiptQueue,
  useReverseReceipt,
  useUndoReceipt,
  useVerifiedAudit,
} from '../hooks/queries';
import { apiErrorMessage } from '../services/authErrors';
import type { VerifiedReceiptAudit } from '../types/api';

export function AdminReceiptsPage() {
  const { data: queue = [], refetch } = useReceiptQueue();
  const { refetch: refetchAudit } = useVerifiedAudit();
  const undoMutation = useUndoReceipt();
  const reverseMutation = useReverseReceipt();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = queue.find((item) => item.id === selectedId) ?? null;

  async function onRendered() {
    setMessage('Decision saved.');
    setError(null);
    setSelectedId(null);
    await Promise.all([refetch(), refetchAudit()]);
  }

  async function onUndo(row: VerifiedReceiptAudit, note: string): Promise<boolean> {
    setError(null);
    try {
      await undoMutation.mutateAsync({ id: row.id, note: note || null });
      setMessage(`Undo applied to ${row.reference_number ?? row.id} — balance restored, no customer notice.`);
      return true;
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Undo failed.'));
      return false;
    }
  }

  async function onReverse(row: VerifiedReceiptAudit, reason: string): Promise<boolean> {
    setError(null);
    try {
      const result = await reverseMutation.mutateAsync({ id: row.id, reason });
      setMessage(
        result.message ?? `Reversal applied to ${row.reference_number ?? row.id} — customer notified.`,
      );
      return true;
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Reverse failed.'));
      return false;
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Verify payments"
        title="Review payment receipts"
        description="Check the receipt and choose what to do. We add credit only after you verify the payment."
      />

      {message ? (
        <Panel className="border-[#bfd8e5] bg-[#f3f9fc]">
          <p role="status" className="text-sm text-[#17679b]">{message}</p>
        </Panel>
      ) : null}
      {error ? (
        <Panel className="border-[#e7c2be] bg-[#fff8f7]">
          <p role="alert" className="text-sm text-[#8f302a]">{error}</p>
        </Panel>
      ) : null}

      <ReversalsPanel onUndo={onUndo} onReverse={onReverse} onError={setError} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel eyebrow="Waiting for review" title="Payment receipts" description="Oldest first.">
          {queue.length === 0 ? (
            <p className="text-xs text-[#73736e]">No payments are waiting for review.</p>
          ) : (
            <div className="divide-y divide-[#efeeea] border-t border-[#efeeea]">
              {queue.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setError(null);
                    setMessage(null);
                  }}
                  className={`block w-full rounded-md px-3 py-3 text-left transition ${
                    selectedId === item.id
                      ? 'bg-[#f7f7f5]'
                      : 'bg-white hover:bg-[#fafaf9]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge label={item.status === 'escalated' ? 'Waiting for customer' : 'Waiting for review'} tone={verdictTone(item.status)} />
                      {item.sender_has_reversed_credit ? (
                        <span className="inline-flex items-center rounded-full border border-[#e2d4eb] bg-[#faf5fd] px-2.5 py-0.5 text-[11px] font-medium text-[#6b4688]">
                          {REVERSED_CREDIT_CHIP}
                        </span>
                      ) : null}
                      {item.is_new_sender ? (
                        <StatusBadge label="New sender" tone="danger" />
                      ) : null}
                      {item.is_cash_sender ? (
                        <StatusBadge label="Cash" tone="warning" />
                      ) : null}
                    </div>
                    <span className="text-[11px] text-[#73736e]">{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-[#252522]">
                    {item.organization_name} · {item.extracted_fields['reference_number'] ?? 'no ref'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#5f5f59]">
                    <span className="font-mono font-medium tabular-nums text-[#454540]">
                      {item.extracted_fields['transfer_amount'] ?? '—'} ETB
                    </span>{' '}
                    · invoice {item.invoice_number ?? '—'} · {item.extracted_fields['sender_name'] ?? 'no sender'}
                  </p>
                  {item.dispute_text ? (
                    <p className="mt-0.5 text-[11px] text-[#885100]">Dispute: {item.dispute_text}</p>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </Panel>

        {selected ? (
          <Panel
            eyebrow="Detail"
            title={`Receipt ${selected.extracted_fields['reference_number'] ?? selected.id}`}
            description={`${selected.organization_name} · invoice ${selected.invoice_number ?? '—'} · designated ${selected.designated_bank_code ?? '—'}`}
          >
            <ReceiptReviewDetailPane key={selected.id} item={selected} onRendered={onRendered} onError={setError} />
          </Panel>
        ) : (
          <Panel eyebrow="Receipt details" title="Choose a receipt" description="Select a receipt to check its details and choose a decision.">
            <p className="text-xs text-[#73736e]">No receipt selected.</p>
          </Panel>
        )}
      </div>
    </div>
  );
}

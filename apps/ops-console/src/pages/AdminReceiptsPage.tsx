import { useEffect, useState } from 'react';

import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { StatusBadge } from '../components/ui/StatusBadge';
import {
  useReceiptAuditEvents,
  useReceiptQueue,
  useRemoveTrustedPayer,
  useReverseReceipt,
  useUndoReceipt,
  useVerifiedAudit,
} from '../hooks/queries';
import { getReceiptFileUrl, renderDecision } from '../services/receiptsApi';
import { apiErrorMessage } from '../services/authErrors';
import type {
  LargeSurplusDecision,
  ReceiptQueueItem,
  TrustedPayerAction,
  Verdict,
  VerifiedReceiptAudit,
} from '../types/api';

const CASH_FLAG = 'Cash deposit. Ask the customer to confirm this was the transfer they intended to make.';
const LARGE_SURPLUS_FLAG = 'This amount is much higher than expected. An admin must review it.';
const LOW_CONFIDENCE_HINT = 'was hard to read. Please check it.';
const REVERSED_CREDIT_CHIP = 'An earlier credit from this sender was reversed';

const FIELD_LABELS: Record<string, string> = {
  sender_name: 'Sender name',
  sender_account_number: 'Sender account',
  receiver_account_number: 'Receiver account',
  receiver_name: 'Receiver name',
  transfer_amount: 'Amount',
  transfer_date: 'Transfer date',
  reference_number: 'Reference',
  bank_identifier: 'Bank',
};

const VERDICT_LABELS: Record<Verdict, string> = {
  verify: 'Verify payment',
  reject_wrong_bank: 'Wrong bank',
  reject_duplicate: 'Duplicate payment',
  reject_illegible: 'Can not read receipt',
  escalate: 'Ask the customer',
};

const SURPLUS_LABELS: Record<LargeSurplusDecision, string> = {
  credit_forward: 'Keep the extra credit',
  credit_backward: 'Apply it to an older bill',
  partial_ignore: 'Credit only part of the payment',
};

function verdictTone(status: ReceiptQueueItem['status']) {
  if (status === 'escalated') return 'warning';
  return 'neutral';
}

// Reversal actions (Undo / Reverse) — server-enforced windows (decision #7)

type ReversalActionButtonsProps = {
  row: VerifiedReceiptAudit;
  onUndo: (row: VerifiedReceiptAudit, note: string) => void;
  onReverse: (row: VerifiedReceiptAudit, reason: string) => void;
};

function ReversalActionButtons({ row, onUndo, onReverse }: ReversalActionButtonsProps) {
  const [mode, setMode] = useState<'idle' | 'undo' | 'reverse'>('idle');
  const [text, setText] = useState('');

  if (row.reversal_status) {
    return (
      <span className="fp-pill capitalize">
        {row.reversal_status === 'reversed' ? 'Payment reversed' : 'Payment undone'}
      </span>
    );
  }

  if (mode === 'idle') {
    return (
      <div className="flex flex-wrap gap-2">
        {row.undo_available ? (
          <button
            type="button"
            onClick={() => setMode('undo')}
            className="fp-action-quiet !min-h-8 !text-[#14745f]"
          >
            Undo
          </button>
        ) : null}
        {row.reverse_available ? (
          <button
            type="button"
            onClick={() => setMode('reverse')}
            className="fp-action-quiet !min-h-8 !text-[#885100]"
          >
            Reverse
          </button>
        ) : null}
      </div>
    );
  }

  const isReverse = mode === 'reverse';
  const canSubmit = isReverse ? text.trim().length > 0 : true;

  function onSubmit() {
    if (isReverse) {
      onReverse(row, text.trim());
    } else {
      onUndo(row, text.trim());
    }
    setMode('idle');
    setText('');
  }

  return (
    <div className="w-full space-y-2">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={isReverse ? 'Reason (required — shown to the customer)' : 'Note (optional)'}
        maxLength={512}
        className="fp-input min-h-20 px-3 py-2"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          className="fp-action-primary !min-h-8 !bg-[#a15b00] text-xs hover:!bg-[#885100]"
        >
          {isReverse ? 'Reverse payment' : 'Undo payment'}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('idle');
            setText('');
          }}
          className="fp-action-secondary !min-h-8 text-xs"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function AuditEventsDrawer({ receiptId }: { receiptId: string }) {
  const { data: events = [] } = useReceiptAuditEvents(receiptId);
  if (events.length === 0) {
    return <p className="text-xs text-[#63766f]">No history yet.</p>;
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
          <p className="mt-1 text-[#40534c]">{event.description}</p>
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

function ReversalsPanel({
  onUndo,
  onReverse,
  onError,
}: {
  onUndo: (row: VerifiedReceiptAudit, note: string) => void;
  onReverse: (row: VerifiedReceiptAudit, reason: string) => void;
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
              className="border-t border-[#e6ebe8] py-2.5 first:border-t-0 first:pt-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[#20372f]">
                    {row.organization_name} · {row.reference_number ?? 'no ref'} ·{' '}
                    <span className="font-mono font-medium tabular-nums">{row.amount_etb ?? '—'}</span> ETB
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#63766f]">
                    Invoice {row.invoice_number ?? '—'} · decided{' '}
                    {row.decided_at ? new Date(row.decided_at).toLocaleString() : '—'}
                  </p>
                  {row.undo_available_until && row.undo_available ? (
                    <p className="mt-0.5 text-[10px] text-[#6b7d76]">
                      You can undo this until {new Date(row.undo_available_until).toLocaleString()}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ReversalActionButtons row={row} onUndo={onUndo} onReverse={onReverse} />
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    className="min-h-7 border border-[#cfd9d5] bg-white px-2 text-[10px] font-semibold text-[#40534c] transition-colors hover:bg-[#eef3f0]"
                  >
                    {expandedId === row.id ? 'Hide history' : 'View history'}
                  </button>
                </div>
              </div>
              {expandedId === row.id ? (
                <div className="mt-2 border-t border-[#e6ebe8] pt-2">
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
        className="mt-3 min-h-7 border border-[#cfd9d5] bg-white px-2.5 text-[10px] font-semibold text-[#40534c] transition hover:bg-[#eef3f0]"
      >
        Refresh history
      </button>
    </Panel>
  );
}

// Admin queue detail

type DetailProps = {
  item: ReceiptQueueItem;
  onRendered: () => void;
  onError: (message: string) => void;
};

function AdminDetail({ item, onRendered, onError }: DetailProps) {
  // Pre-fill ONLY when the service actually recommends verify (trusted payer
  // or wrong-bank-within-portfolio). CASH and new-sender receipts must NOT
  // pre-fill. An admin must choose an outcome for these receipts.
  const [verdict, setVerdict] = useState<Verdict | null>(item.recommended_verdict);
  const [note, setNote] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [trustedPayerAction, setTrustedPayerAction] = useState<TrustedPayerAction>('verified_once');
  const [surplusDecision, setSurplusDecision] = useState<LargeSurplusDecision>('credit_forward');
  const [partialAmount, setPartialAmount] = useState('');
  const [verifiedAmount, setVerifiedAmount] = useState('');
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const removeMutation = useRemoveTrustedPayer();

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  const fieldRows: Array<[string, string | null, number]> = [
    ['sender_name', item.extracted_fields['sender_name'] ?? null, item.confidence['sender_name'] ?? 0],
    ['sender_account_number', item.extracted_fields['sender_account_number'] ?? null, item.confidence['sender_account_number'] ?? 0],
    ['receiver_account_number', item.extracted_fields['receiver_account_number'] ?? null, item.confidence['receiver_account_number'] ?? 0],
    ['receiver_name', item.extracted_fields['receiver_name'] ?? null, item.confidence['receiver_name'] ?? 0],
    ['transfer_amount', item.extracted_fields['transfer_amount'] ?? null, item.confidence['transfer_amount'] ?? 0],
    ['transfer_date', item.extracted_fields['transfer_date'] ?? null, item.confidence['transfer_date'] ?? 0],
    ['reference_number', item.extracted_fields['reference_number'] ?? null, item.confidence['reference_number'] ?? 0],
    ['bank_identifier', item.extracted_fields['bank_identifier'] ?? null, item.confidence['bank_identifier'] ?? 0],
  ];

  async function onPreview() {
    if (!fileUrl) {
      try {
        setFileUrl(await getReceiptFileUrl(item.id));
      } catch {
        onError('Unable to load receipt file.');
      }
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!verdict) return;
    setBusy(true);
    try {
      await renderDecision(item.id, {
        verdict,
        note: verdict === 'escalate' ? note : null,
        admin_note: adminNote || null,
        trusted_payer_action: verdict === 'verify' ? trustedPayerAction : null,
        large_surplus_decision: verdict === 'verify' && item.is_large_surplus ? surplusDecision : null,
        partial_credit_amount_etb:
          verdict === 'verify' && item.is_large_surplus && surplusDecision === 'partial_ignore'
            ? partialAmount
            : null,
        verified_amount_etb:
          verdict === 'verify' && !item.extracted_fields['transfer_amount']
            ? verifiedAmount
            : null,
      });
      onRendered();
    } catch (error: unknown) {
      onError(apiErrorMessage(error, 'Could not save the decision.'));
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveTrustedPayer() {
    const sender = item.extracted_fields['sender_name'] ?? '';
    if (!sender || !window.confirm(`Remove "${sender}" from this workspace's trusted-payer list?`)) {
      return;
    }
    setRemoving(true);
    try {
      await removeMutation.mutateAsync({ senderName: sender, organizationId: item.organization_id });
      onError('');
    } catch (error: unknown) {
      onError(apiErrorMessage(error, 'Failed to remove trusted payer.'));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Segment 1 — flags: flag chips plus the informational fraud-badge
          admin controls (display-only, never blocks — NB-21.4/21.6) */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
                      {item.sender_has_reversed_credit ? (
          <span className="inline-flex items-center rounded-full border border-[#e2d4eb] bg-[#faf5fd] px-2.5 py-1 text-xs font-medium text-[#6b4688]">
            {REVERSED_CREDIT_CHIP}
          </span>
        ) : null}
        {item.is_new_sender ? (
          <span className="inline-flex items-center rounded-full border border-[#e7c2be] bg-[#fff8f7] px-2.5 py-1 text-xs font-medium text-[#a3342f]">
            New sender
          </span>
        ) : null}
        {item.is_cash_sender ? (
          <span className="inline-flex items-center border border-[#e7d1a8] bg-[#fffaf0] px-2 py-1 text-[10px] font-semibold text-[#885100]">
            {CASH_FLAG}
          </span>
        ) : null}
        {item.is_wrong_bank_within_portfolio ? (
          <span className="inline-flex items-center border border-[#bfd8e5] bg-[#f3f9fc] px-2 py-1 text-[10px] font-semibold text-[#17679b]">
            Paid into a different bank in your group. Verify is already selected.
          </span>
        ) : null}
        {item.is_large_surplus ? (
          <span className="inline-flex items-center border border-[#e7d1a8] bg-[#fffaf0] px-2 py-1 text-[10px] font-semibold text-[#885100]">
            {LARGE_SURPLUS_FLAG} (<span className="font-mono tabular-nums">{item.surplus_etb ?? '0'}</span> ETB)
          </span>
        ) : null}
        {item.has_zero_confidence ? (
          <span className="fp-pill">
            {item.zero_confidence_warning}
          </span>
        ) : null}
        {item.low_confidence_fields.map((field) => (
          <span key={field} className="fp-pill">
            {field} {LOW_CONFIDENCE_HINT}
          </span>
        ))}
        {item.dispute_text ? (
          <span className="inline-flex items-center border border-[#e7d1a8] bg-[#fffaf0] px-2 py-1 text-[10px] font-semibold text-[#885100]">
            Customer disputes rejection: {item.dispute_text}
          </span>
        ) : null}
        </div>

        {item.sender_has_reversed_credit ? (
          <div className="rounded-md bg-[#faf5fd] p-3">
            <p className="text-xs font-semibold text-[#6b4688]">
              {REVERSED_CREDIT_CHIP}
            </p>
            <p className="mt-1 text-[11px] text-[#63766f]">
              This is a warning, not a block. You can still verify the payment or ask the customer.
              {item.fraud_risk_since
                ? ` Flagged since ${new Date(item.fraud_risk_since).toLocaleString()}.`
                : ''}
            </p>
            <button
              type="button"
              disabled={removing}
              onClick={onRemoveTrustedPayer}
              className="fp-action-quiet mt-2 !text-[#a3342f]"
            >
              {removing ? 'Removing…' : 'Remove sender from trusted-payer list'}
            </button>
          </div>
        ) : null}
      </div>

      {/* Segment 2 — extracted fields with confidence bars */}
      <div className="grid grid-cols-1 gap-2 border-t border-[#e6ebe8] pt-3 md:grid-cols-2">
        {fieldRows.map(([label, value, confidence]) => (
          <div key={label} className="border-b border-[#efeeea] py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#73736e]">{FIELD_LABELS[label] ?? label}</span>
              <span className="text-[11px] tabular-nums text-[#73736e]">{Math.round(confidence * 100)}%</span>
            </div>
            <p className="mt-1 break-all font-mono text-xs text-[#20372f]">{value ?? '—'}</p>
            <div className="mt-2 h-1 overflow-hidden bg-[#dce8e3]">
              <div
                className={`h-full ${confidence < 0.6 ? 'bg-[#a15b00]' : 'bg-[#16856b]'}`}
                style={{ width: `${Math.round(confidence * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Segment 3 — file preview */}
      <div className="rounded-md bg-[#f7f7f5] p-3">
        <button
          type="button"
          onClick={onPreview}
          className="fp-action-secondary !min-h-8 text-xs"
        >
          {fileUrl ? 'Preview loaded' : 'Preview receipt file'}
        </button>
        {fileUrl ? (
          <div className="mt-3">
            {item.content_type === 'application/pdf' ? (
              <iframe title="receipt-preview" src={fileUrl} className="h-72 w-full border border-[#d7dfdc] bg-white" />
            ) : (
              <img src={fileUrl} alt="receipt preview" className="max-h-72 border border-[#d7dfdc] bg-white" />
            )}
          </div>
        ) : null}
      </div>

      {/* Choose the outcome for this receipt. */}
      <div className="grid gap-3 border-t border-[#e6ebe8] pt-3">
        <p className="text-xs font-semibold text-[#73736e]">What should happen?</p>
        <div className="flex flex-wrap gap-2">
          {(['verify', 'reject_wrong_bank', 'reject_duplicate', 'reject_illegible', 'escalate'] as Verdict[]).map((v) => {
            const isVerify = v === 'verify';
            const isEscalate = v === 'escalate';
            const active = verdict === v;
            const tierClass = isVerify
              ? active
                ? 'border-[#087f72] bg-[#087f72] text-white'
                : 'border-[#bfd8e5] bg-white text-[#17679b] hover:bg-[#f3f9fc]'
              : isEscalate
                ? active
                  ? 'border-[#a15b00] bg-[#a15b00] text-white'
                  : 'border-[#e7d1a8] bg-white text-[#885100] hover:bg-[#fffaf0]'
                : active
                  ? 'border-[#b93a36] bg-[#b93a36] text-white'
                  : 'border-[#e7c2be] bg-white text-[#a3342f] hover:bg-[#fff8f7]';
            return (
              <button
                key={v}
                type="button"
                onClick={() => setVerdict(v)}
                className={`min-h-8 border px-2.5 text-[11px] font-semibold transition ${tierClass}`}
              >
                {VERDICT_LABELS[v]}
              </button>
            );
          })}
        </div>

        {verdict === 'verify' && item.is_large_surplus ? (
          <div className="border border-[#e7d1a8] bg-[#fffaf0] p-3">
            <p className="text-xs font-semibold text-[#885100]">{LARGE_SURPLUS_FLAG}</p>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              {(['credit_forward', 'credit_backward', 'partial_ignore'] as LargeSurplusDecision[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSurplusDecision(d)}
                  className={`min-h-8 border px-2.5 text-[11px] font-semibold transition ${
                    surplusDecision === d
                      ? 'border-[#a15b00] bg-white text-[#885100]'
                      : 'border-[#d7dfdc] bg-white text-[#63766f] hover:border-[#a9bbb4]'
                  }`}
                >
                  {SURPLUS_LABELS[d]}
                </button>
              ))}
            </div>
            {surplusDecision === 'partial_ignore' ? (
              <input
                value={partialAmount}
                onChange={(event) => setPartialAmount(event.target.value)}
                placeholder="Amount to credit (ETB)"
                className="fp-input mt-3 min-h-10 px-3"
              />
            ) : null}
          </div>
        ) : null}

        {verdict === 'verify' ? (
          !item.extracted_fields['transfer_amount'] ? (
            <div className="border border-[#e7d1a8] bg-[#fffaf0] p-3">
              <label htmlFor="verified-amount" className="text-xs font-semibold text-[#885100]">
                Amount shown on the receipt (ETB)
              </label>
              <input
                id="verified-amount"
                inputMode="decimal"
                value={verifiedAmount}
                onChange={(event) => setVerifiedAmount(event.target.value)}
                placeholder="Enter the amount you verified"
                className="fp-input mt-2 min-h-10 px-3"
              />
            </div>
          ) : null
        ) : null}

        {verdict === 'verify' ? (
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="trusted-payer-action" className="text-xs font-semibold text-[#73736e]">Remember this sender?</label>
            <select
              id="trusted-payer-action"
              value={trustedPayerAction}
              onChange={(event) => setTrustedPayerAction(event.target.value as TrustedPayerAction)}
              className="fp-input min-h-10"
            >
              <option value="verified_once">Verify only</option>
              <option value="added">Verify and add to trusted senders</option>
            </select>
          </div>
        ) : null}

        {verdict === 'escalate' ? (
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Question for the customer (required)"
            className="fp-input min-h-24 px-4 py-3"
          />
        ) : null}

        <input
          value={adminNote}
          onChange={(event) => setAdminNote(event.target.value)}
          placeholder="Admin note (optional)"
          maxLength={512}
          className="fp-input min-h-10 px-3"
        />

        <button
          type="submit"
          disabled={
            busy
            || !verdict
            || (verdict === 'escalate' && !note.trim())
            || (verdict === 'verify' && !item.extracted_fields['transfer_amount'] && !verifiedAmount.trim())
          }
          className="fp-action-primary"
        >
          {busy ? 'Saving…' : 'Save decision'}
        </button>
      </div>
    </form>
  );
}

// Page

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

  async function onUndo(row: VerifiedReceiptAudit, note: string) {
    setError(null);
    try {
      await undoMutation.mutateAsync({ id: row.id, note: note || null });
      setMessage(`Undo applied to ${row.reference_number ?? row.id} — balance restored, no customer notice.`);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Undo failed.'));
    }
  }

  async function onReverse(row: VerifiedReceiptAudit, reason: string) {
    setError(null);
    try {
      const result = await reverseMutation.mutateAsync({ id: row.id, reason });
      setMessage(
        result.message ?? `Reversal applied to ${row.reference_number ?? row.id} — customer notified.`,
      );
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Reverse failed.'));
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
          <p className="text-sm text-[#17679b]">{message}</p>
        </Panel>
      ) : null}
      {error ? (
        <Panel className="border-[#e7c2be] bg-[#fff8f7]">
          <p className="text-sm text-[#8f302a]">{error}</p>
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
                  className={`block w-full py-3 text-left transition ${
                    selectedId === item.id
                      ? 'bg-[#f2f7f4]'
                      : 'bg-white hover:bg-[#fafaf9]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge label={item.status === 'escalated' ? 'Waiting for customer' : 'Waiting for review'} tone={verdictTone(item.status)} />
        {item.sender_has_reversed_credit ? (
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-medium text-[#6b4688]">
                          {REVERSED_CREDIT_CHIP}
                        </span>
                      ) : null}
                      {item.is_new_sender ? (
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-medium text-[#a3342f]">
                          New sender
                        </span>
                      ) : null}
                      {item.is_cash_sender ? (
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-medium text-[#885100]">
                          Cash
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[11px] text-[#73736e]">{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-[#252522]">
                    {item.organization_name} · {item.extracted_fields['reference_number'] ?? 'no ref'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#63766f]">
                    <span className="font-mono font-medium tabular-nums text-[#40534c]">
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
            <AdminDetail key={selected.id} item={selected} onRendered={onRendered} onError={setError} />
          </Panel>
        ) : (
          <Panel eyebrow="Receipt details" title="Choose a receipt" description="Select a receipt to check its details and choose a decision.">
            <p className="text-xs text-[#63766f]">No receipt selected.</p>
          </Panel>
        )}
      </div>
    </div>
  );
}


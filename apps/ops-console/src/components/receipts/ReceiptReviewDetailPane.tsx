import { useEffect, useState } from 'react';

import { useRemoveTrustedPayer } from '../../hooks/queries';
import { apiErrorMessage } from '../../services/authErrors';
import { getReceiptFileUrl, renderDecision } from '../../services/receiptsApi';
import type {
  LargeSurplusDecision,
  ReceiptQueueItem,
  TrustedPayerAction,
  Verdict,
} from '../../types/api';
import { Dialog } from '../ui/Dialog';
import { StatusBadge } from '../ui/StatusBadge';
import {
  CASH_FLAG,
  FIELD_LABELS,
  LARGE_SURPLUS_FLAG,
  LOW_CONFIDENCE_HINT,
  REVERSED_CREDIT_CHIP,
  SURPLUS_LABELS,
  VERDICT_LABELS,
} from './receiptReviewConstants';

type DetailProps = {
  item: ReceiptQueueItem;
  onRendered: () => void;
  onError: (message: string) => void;
};

export function ReceiptReviewDetailPane({ item, onRendered, onError }: DetailProps) {
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
  const [confirmRemoveSender, setConfirmRemoveSender] = useState<string | null>(null);
  const removeMutation = useRemoveTrustedPayer();
  const needsVerifiedAmount = !item.extracted_fields['transfer_amount'];
  const enteredAmount = Number(verifiedAmount);
  const invoiceBalance = Number(item.invoice_balance_etb);
  const enteredAmountNeedsSurplusDecision = (
    needsVerifiedAmount
    && Number.isFinite(enteredAmount)
    && Number.isFinite(invoiceBalance)
    && enteredAmount > invoiceBalance + 1000
  );
  const requiresSurplusDecision = item.is_large_surplus || enteredAmountNeedsSurplusDecision;

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
        large_surplus_decision: verdict === 'verify' && requiresSurplusDecision ? surplusDecision : null,
        partial_credit_amount_etb:
          verdict === 'verify' && requiresSurplusDecision && surplusDecision === 'partial_ignore'
            ? partialAmount
            : null,
        verified_amount_etb:
          verdict === 'verify' && needsVerifiedAmount
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

  async function onRemoveTrustedPayer(sender: string) {
    setRemoving(true);
    try {
      await removeMutation.mutateAsync({ senderName: sender, organizationId: item.organization_id });
      setConfirmRemoveSender(null);
      onError('');
    } catch (error: unknown) {
      onError(apiErrorMessage(error, 'Failed to remove trusted payer.'));
      setConfirmRemoveSender(null);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {confirmRemoveSender ? (
        <Dialog
          eyebrow="Trusted payers"
          title={`Remove "${confirmRemoveSender}" from trusted payers?`}
          description="Receipts from this sender will no longer fast-track in this workspace."
          onClose={() => { if (!removing) setConfirmRemoveSender(null); }}
          actions={
            <>
              <button
                type="button"
                disabled={removing}
                onClick={() => setConfirmRemoveSender(null)}
                className="fp-action-secondary !min-h-8 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={removing}
                onClick={() => void onRemoveTrustedPayer(confirmRemoveSender)}
                className="fp-action-danger !min-h-8 text-xs"
              >
                {removing ? 'Removing…' : 'Remove sender'}
              </button>
            </>
          }
        />
      ) : null}

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
            <StatusBadge label="New sender" tone="danger" />
          ) : null}
          {item.is_cash_sender ? (
            <span className="inline-flex items-center rounded-md border border-[#e7d1a8] bg-[#fffaf0] px-2.5 py-1 text-[11px] font-medium text-[#885100]">
              {CASH_FLAG}
            </span>
          ) : null}
          {item.is_wrong_bank_within_portfolio ? (
            <span className="inline-flex items-center rounded-md border border-[#bfd8e5] bg-[#f3f9fc] px-2.5 py-1 text-[11px] font-medium text-[#17679b]">
              Paid into a different bank in your group. Verify is already selected.
            </span>
          ) : null}
          {item.is_large_surplus ? (
            <span className="inline-flex items-center rounded-md border border-[#e7d1a8] bg-[#fffaf0] px-2.5 py-1 text-[11px] font-medium text-[#885100]">
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
              {FIELD_LABELS[field] ?? field} {LOW_CONFIDENCE_HINT}
            </span>
          ))}
          {item.dispute_text ? (
            <span className="inline-flex items-center rounded-md border border-[#e7d1a8] bg-[#fffaf0] px-2.5 py-1 text-[11px] font-medium text-[#885100]">
              Customer disputes rejection: {item.dispute_text}
            </span>
          ) : null}
        </div>

        {item.sender_has_reversed_credit ? (
          <div className="rounded-md bg-[#faf5fd] p-3">
            <p className="text-xs font-semibold text-[#6b4688]">
              {REVERSED_CREDIT_CHIP}
            </p>
            <p className="mt-1 text-[11px] text-[#5f5f59]">
              This is a warning, not a block. You can still verify the payment or ask the customer.
              {item.fraud_risk_since
                ? ` Flagged since ${new Date(item.fraud_risk_since).toLocaleString()}.`
                : ''}
            </p>
            <button
              type="button"
              disabled={removing || !item.extracted_fields['sender_name']}
              onClick={() => {
                const sender = item.extracted_fields['sender_name'] ?? '';
                if (sender) setConfirmRemoveSender(sender);
              }}
              className="fp-action-quiet mt-2 !text-[#a3342f]"
            >
              {removing ? 'Removing…' : 'Remove sender from trusted-payer list'}
            </button>
          </div>
        ) : null}
      </div>

      {/* Segment 2 — extracted fields with confidence bars */}
      <div className="grid grid-cols-1 gap-2 border-t border-[#efeeea] pt-3 md:grid-cols-2">
        {fieldRows.map(([label, value, confidence]) => (
          <div key={label} className="border-b border-[#efeeea] py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#73736e]">{FIELD_LABELS[label] ?? label}</span>
              <span className="text-[11px] tabular-nums text-[#73736e]">{Math.round(confidence * 100)}%</span>
            </div>
            <p className="mt-1 break-all font-mono text-xs text-[#252522]">{value ?? '—'}</p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#efeeea]">
              <div
                className={`h-full rounded-full ${confidence < 0.6 ? 'bg-[#a15b00]' : 'bg-[#16856b]'}`}
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
              <iframe title="receipt-preview" src={fileUrl} className="h-72 w-full rounded-md border border-[#e5e4e0] bg-white" />
            ) : (
              <img src={fileUrl} alt="receipt preview" className="max-h-72 rounded-md border border-[#e5e4e0] bg-white" />
            )}
          </div>
        ) : null}
      </div>

      {/* Choose the outcome for this receipt. */}
      <div className="grid gap-3 border-t border-[#efeeea] pt-3">
        <p className="text-xs font-semibold text-[#73736e]">What should happen?</p>
        <div className="flex flex-wrap gap-2">
          {(['verify', 'reject_wrong_bank', 'reject_duplicate', 'reject_illegible', 'escalate'] as Verdict[]).map((v) => {
            const isVerify = v === 'verify';
            const isEscalate = v === 'escalate';
            const active = verdict === v;
            const tierClass = isVerify
              ? active
                ? 'border-[#176b5c] bg-[#176b5c] text-white'
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
                className={`min-h-8 rounded-md border px-2.5 text-[11px] font-semibold transition ${tierClass}`}
              >
                {VERDICT_LABELS[v]}
              </button>
            );
          })}
        </div>

        {verdict === 'verify' && requiresSurplusDecision ? (
          <div className="rounded-md border border-[#e7d1a8] bg-[#fffaf0] p-3">
            <p className="text-xs font-semibold text-[#885100]">{LARGE_SURPLUS_FLAG}</p>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              {(['credit_forward', 'credit_backward', 'partial_ignore'] as LargeSurplusDecision[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSurplusDecision(d)}
                  className={`min-h-8 rounded-md border px-2.5 text-[11px] font-semibold transition ${
                    surplusDecision === d
                      ? 'border-[#a15b00] bg-white text-[#885100]'
                      : 'border-[#e5e4e0] bg-white text-[#5f5f59] hover:border-[#c9c8c2]'
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
          needsVerifiedAmount ? (
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

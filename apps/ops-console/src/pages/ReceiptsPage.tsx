import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useReceipts, useSubmitDispute, useWallet } from '../hooks/queries';
import type { Receipt } from '../types/api';

const UPLOAD_CONFIRMATION = 'Receipt received — verification typically takes ≤24 hours.';

function statusTone(status: Receipt['status']) {
  if (status === 'verified') return 'success';
  if (status === 'rejected') return 'danger';
  if (status === 'escalated') return 'warning';
  return 'neutral';
}

function ReceiptCard({ receipt, onDispute }: { receipt: Receipt; onDispute: (text: string) => void }) {
  const [disputeText, setDisputeText] = useState('');
  const [showDispute, setShowDispute] = useState(false);

  return (
    <article className="fp-row">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusBadge label={receipt.status} tone={statusTone(receipt.status)} />
        <span className="font-mono text-sm font-semibold tabular-nums text-[#20372f]">
          {receipt.amount_etb ? `${receipt.amount_etb} ETB` : 'Amount pending extraction'}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-[#6b7d76]">
          {receipt.reference_number ?? 'no reference extracted'}
        </span>
        <span className="text-xs text-[#63766f]">
          Invoice: {receipt.invoice_number ?? '—'} · Sender: {receipt.sender_name ?? '—'} · Bank:{' '}
          {receipt.bank_code ?? '—'}
        </span>
        <span className="ml-auto text-[10px] text-[#63766f]">{new Date(receipt.created_at).toLocaleString()}</span>
      </div>

      {receipt.reversal_status ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge label={receipt.reversal_status} tone={receipt.reversal_status === 'reversed' ? 'danger' : 'neutral'} />
        </div>
      ) : null}

      {receipt.status === 'verified' && !receipt.reversal_status ? (
        <p className="mt-2 text-xs text-[#14745f]">
          {receipt.invoice_number ? `Invoice #${receipt.invoice_number} paid. Your workspace is unlocked.` : 'Receipt verified.'}
        </p>
      ) : null}

      {receipt.reversal_status === 'reversed' ? (
        <div className="mt-2 border border-[#e7c2be] bg-[#fff8f7] p-3">
          <p className="text-xs text-[#8f302a]">
            This payment was reversed — the credited amount was restored to your invoice balance. See
            your notifications for the full message.
          </p>
        </div>
      ) : null}

      {receipt.status === 'rejected' && receipt.rejection_reason ? (
        <div className="mt-2 border border-[#e7c2be] bg-[#fff8f7] p-3">
          <p className="text-xs text-[#8f302a]">{receipt.rejection_reason}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setShowDispute(false);
                document.getElementById('receipt-upload-input')?.click();
              }}
              className="inline-flex min-h-8 items-center justify-center border border-[#cfd9d5] bg-white px-3 text-[11px] font-semibold text-[#40534c] transition-colors hover:bg-[#eef3f0]"
            >
              Re-upload
            </button>
            <button
              type="button"
              onClick={() => setShowDispute((v) => !v)}
              className="inline-flex min-h-8 items-center justify-center border border-[#e7d1a8] bg-white px-3 text-[11px] font-semibold text-[#885100] transition-colors hover:bg-[#fcf6e9]"
            >
              Dispute this decision
            </button>
          </div>
          {showDispute ? (
            <div className="mt-3 space-y-2">
              <textarea
                value={disputeText}
                onChange={(event) => setDisputeText(event.target.value)}
                placeholder="Explain why you believe the rejection was wrong…"
                maxLength={1000}
                className="fp-input min-h-24 px-4 py-3"
              />
              <button
                type="button"
                disabled={!disputeText.trim()}
                onClick={() => {
                  onDispute(disputeText.trim());
                  setShowDispute(false);
                }}
                className="inline-flex min-h-8 items-center justify-center bg-[#a15b00] px-3 text-[11px] font-semibold text-white transition-colors hover:bg-[#885100] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Submit dispute
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {receipt.status === 'escalated' ? (
        <p className="mt-2 border border-[#e7d1a8] bg-[#fffaf0] p-3 text-xs text-[#704500]">
          Your receipt is under review. FreightPilot has a question about your recent receipt — please
          watch your notifications for the details.
        </p>
      ) : null}
    </article>
  );
}

export function ReceiptsPage() {
  const { data: receipts = [], refetch: refetchReceipts } = useReceipts();
  const { data: wallet } = useWallet();
  const disputeMutation = useSubmitDispute();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const { uploadReceipt } = await import('../services/receiptsApi');
      const result = await uploadReceipt(selectedFile);
      setStatusMessage(result.message || UPLOAD_CONFIRMATION);
      setSelectedFile(null);
      (event.target as HTMLFormElement).reset();
      await refetchReceipts();
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErrorMessage(detail ?? 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  async function onDispute(receiptId: string, text: string) {
    setErrorMessage(null);
    try {
      await disputeMutation.mutateAsync({ id: receiptId, text });
      setStatusMessage('Dispute submitted — your receipt is now under review.');
    } catch {
      setErrorMessage('Failed to submit dispute.');
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Payments"
        title="Receipts and wallet"
        description="Upload bank-transfer receipts — no invoice selection needed; the system routes each receipt to your oldest open invoice. Verification typically takes ≤24 hours."
      />

      {statusMessage ? (
        <Panel className="border-[#bfd8e5] bg-[#f3f9fc]">
          <p className="text-sm text-[#17679b]">{statusMessage}</p>
        </Panel>
      ) : null}
      {errorMessage ? (
        <Panel className="border-[#e7c2be] bg-[#fff8f7]">
          <p className="text-sm text-[#8f302a]">{errorMessage}</p>
        </Panel>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel
          eyebrow="Upload"
          title="Upload a transfer receipt"
          description="PNG, JPG, or PDF up to 5 MB. Keep the reference number and amount visible."
        >
          <form onSubmit={onUpload} className="grid gap-3">
            <input
              id="receipt-upload-input"
              type="file"
              accept=".png,.jpg,.jpeg,.pdf"
              onChange={onFileSelected}
              className="fp-input min-h-10 px-3"
            />
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="inline-flex min-h-9 items-center justify-center bg-[#087f72] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#06675d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Upload receipt'}
            </button>
          </form>
          <p className="mt-3 text-xs text-[#63766f]">
            {selectedFile ? `${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB) selected` : 'No file selected.'}
          </p>
        </Panel>

        <Panel
          eyebrow="Wallet"
          title="Surplus credits"
          description="Overpayments within tolerance apply as credit to your next invoice automatically."
        >
          {wallet ? (
            <>
              <div className="border border-[#d7dfdc] bg-[#f8faf9] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#63766f]">Available balance</p>
                <p className="mt-1 font-mono text-2xl font-medium tabular-nums text-[#172a24]">
                  {wallet.available_etb} ETB
                </p>
                <p className="mt-1 text-xs text-[#63766f]">
                  Wallet balance: +{wallet.available_etb} ETB applies to next invoice.
                </p>
              </div>
              {wallet.credits.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {wallet.credits.slice(0, 6).map((credit) => (
                    <div
                      key={`${credit.created_at}-${credit.amount_etb}`}
                      className="flex items-center justify-between fp-row px-4 py-3 text-sm"
                    >
                      <span className="text-[#40534c]">+{credit.amount_etb} ETB</span>
                      <span className="text-[10px] text-[#63766f]">
                        {credit.status}
                        {credit.applied_to_invoice_number ? ` → ${credit.applied_to_invoice_number}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-[#63766f]">No surplus credits yet.</p>
              )}
            </>
          ) : (
            <p className="text-xs text-[#63766f]">Wallet unavailable.</p>
          )}
        </Panel>
      </div>

      <Panel
        eyebrow="History"
        title="Your receipts"
        description="Rejections show the reason and let you re-upload or dispute the decision."
      >
        {receipts.length === 0 ? (
          <p className="text-xs text-[#63766f]">No receipts uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {receipts.map((receipt) => (
              <ReceiptCard
                key={receipt.id}
                receipt={receipt}
                onDispute={(text) => onDispute(receipt.id, text)}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}


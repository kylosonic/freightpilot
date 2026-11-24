import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useReceipts, useSubmitDispute, useWallet } from '../hooks/queries';
import { apiErrorMessage } from '../services/authErrors';
import type { Receipt } from '../types/api';

const UPLOAD_CONFIRMATION = 'Receipt received — verification typically takes ≤24 hours.';

function statusTone(status: Receipt['status']) {
  if (status === 'verified') return 'success';
  if (status === 'rejected') return 'danger';
  if (status === 'escalated') return 'warning';
  return 'neutral';
}

function ReceiptCard({ receipt, onDispute }: { receipt: Receipt; onDispute: (text: string) => Promise<boolean> }) {
  const [disputeText, setDisputeText] = useState('');
  const [showDispute, setShowDispute] = useState(false);
  const [disputing, setDisputing] = useState(false);

  return (
    <article className="fp-row">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusBadge label={receipt.status} tone={statusTone(receipt.status)} />
        <span className="font-mono text-sm font-semibold tabular-nums text-[#252522]">
          {receipt.amount_etb ? `${receipt.amount_etb} ETB` : 'Amount pending extraction'}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-[#73736e]">
          {receipt.reference_number ?? 'no reference extracted'}
        </span>
        <span className="text-xs text-[#5f5f59]">
          Invoice: {receipt.invoice_number ?? '—'} · Sender: {receipt.sender_name ?? '—'} · Bank:{' '}
          {receipt.bank_code ?? '—'}
        </span>
        <span className="ml-auto text-[10px] text-[#73736e]">{new Date(receipt.created_at).toLocaleString()}</span>
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
        <div className="mt-2 rounded-md border border-[#e7c2be] bg-[#fff8f7] p-3">
          <p className="text-xs text-[#8f302a]">
            This payment was reversed — the credited amount was restored to your invoice balance. See
            your notifications for the full message.
          </p>
        </div>
      ) : null}

      {receipt.status === 'rejected' && receipt.rejection_reason ? (
        <div className="mt-2 rounded-md border border-[#e7c2be] bg-[#fff8f7] p-3">
          <p className="text-xs text-[#8f302a]">{receipt.rejection_reason}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setShowDispute(false);
                document.getElementById('receipt-upload-input')?.click();
              }}
              className="fp-action-secondary !min-h-8 text-xs"
            >
              Re-upload
            </button>
            <button
              type="button"
              onClick={() => setShowDispute((v) => !v)}
              className="fp-action-secondary !min-h-8 border-[#e7d1a8] !text-[#885100] hover:bg-[#fcf6e9] text-xs"
            >
              Dispute this decision
            </button>
          </div>
          {showDispute ? (
            <div className="mt-3 space-y-2">
              <textarea
                aria-label="Explain why you believe the rejection was wrong"
                value={disputeText}
                onChange={(event) => setDisputeText(event.target.value)}
                placeholder="Explain why you believe the rejection was wrong…"
                maxLength={1000}
                className="fp-input min-h-24 px-4 py-3"
              />
              <button
                type="button"
                disabled={!disputeText.trim() || disputing}
                onClick={async () => {
                  setDisputing(true);
                  const ok = await onDispute(disputeText.trim());
                  setDisputing(false);
                  if (ok) {
                    setDisputeText('');
                    setShowDispute(false);
                  }
                }}
                className="fp-action-primary !min-h-8 !bg-[#a15b00] text-xs hover:!bg-[#885100]"
              >
                {disputing ? 'Submitting...' : 'Submit dispute'}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {receipt.status === 'escalated' ? (
        <p className="mt-2 rounded-md border border-[#e7d1a8] bg-[#fffaf0] p-3 text-xs text-[#704500]">
          We are still checking this receipt. We will send you a message if we need more information.
        </p>
      ) : null}
    </article>
  );
}

export function ReceiptsPage() {
  const { data: receipts = [], isLoading: receiptsLoading, refetch: refetchReceipts } = useReceipts();
  const { data: wallet, isLoading: walletLoading } = useWallet();
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
      setErrorMessage(apiErrorMessage(error, 'Upload failed. Please try again.'));
    } finally {
      setUploading(false);
    }
  }

  function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  async function onDispute(receiptId: string, text: string): Promise<boolean> {
    setErrorMessage(null);
    try {
      await disputeMutation.mutateAsync({ id: receiptId, text });
      setStatusMessage('Dispute submitted — your receipt is now under review.');
      return true;
    } catch {
      setErrorMessage('Failed to submit dispute.');
      return false;
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Billing"
        title="Payments"
        description="Upload your bank receipt and we will apply it to your oldest unpaid invoice. Most receipts are checked within 24 hours."
      />

      {statusMessage ? (
        <Panel className="border-[#bfd8e5] bg-[#f3f9fc]">
          <p role="status" className="text-sm text-[#17679b]">{statusMessage}</p>
        </Panel>
      ) : null}
      {errorMessage ? (
        <Panel className="border-[#e7c2be] bg-[#fff8f7]">
          <p role="alert" className="text-sm text-[#8f302a]">{errorMessage}</p>
        </Panel>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel
          eyebrow="Upload"
          title="Upload a transfer receipt"
          description="PNG, JPG, or PDF from CBE or Dashen up to 5 MB. Keep the reference number and amount visible."
        >
          <form onSubmit={onUpload} className="grid gap-3">
            <input
              id="receipt-upload-input"
              aria-label="Upload bank transfer receipt"
              type="file"
              accept=".png,.jpg,.jpeg,.pdf"
              onChange={onFileSelected}
              className="fp-input min-h-10 px-3"
            />
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="fp-action-primary"
            >
              {uploading ? 'Uploading…' : 'Upload receipt'}
            </button>
          </form>
          <p className="mt-3 text-xs text-[#5f5f59]">
            {selectedFile ? `${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB) selected` : 'No file selected.'}
          </p>
        </Panel>

        <Panel
          eyebrow="Wallet"
          title="Credit balance"
          description="If you pay a little extra, the credit goes toward your next invoice."
        >
          {walletLoading ? (
            <p className="text-xs text-[#73736e]">Loading balance...</p>
          ) : wallet ? (
            <>
              <div className="rounded-md border border-[#e5e4e0] bg-[#f7f7f5] p-3">
                <p className="text-xs text-[#73736e]">Available credit</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-[#252522]">
                  {wallet.available_etb} ETB
                </p>
                <p className="mt-1 text-xs text-[#73736e]">
                  {wallet.available_etb} ETB will go toward your next invoice.
                </p>
              </div>
              {wallet.credits.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {wallet.credits.slice(0, 6).map((credit) => (
                    <div
                      key={`${credit.created_at}-${credit.amount_etb}`}
                      className="flex items-center justify-between fp-row px-4 py-3 text-sm"
                    >
                      <span className="text-[#252522]">+{credit.amount_etb} ETB</span>
                      <span className="text-[10px] text-[#73736e]">
                        {credit.status}
                        {credit.applied_to_invoice_number ? ` → ${credit.applied_to_invoice_number}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-[#73736e]">No credit yet.</p>
              )}
            </>
          ) : (
            <p className="text-xs text-[#73736e]">Your credit balance is unavailable right now.</p>
          )}
        </Panel>
      </div>

      <Panel
        eyebrow="History"
        title="Your receipts"
        description="If we cannot accept a receipt, you can read why, upload it again, or ask us to review it."
      >
        {receiptsLoading ? (
          <p className="text-xs text-[#73736e]">Loading receipts...</p>
        ) : receipts.length === 0 ? (
          <p className="text-xs text-[#73736e]">No receipts uploaded yet.</p>
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


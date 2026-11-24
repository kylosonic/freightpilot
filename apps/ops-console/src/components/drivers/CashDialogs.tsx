import { useState } from 'react';

import type { CashCollection } from '../../types/api';
import { Dialog } from '../ui/Dialog';
import { etb } from './driverFormatting';

export function DeclareCashDialog({
  record,
  busy = false,
  onConfirm,
  onCancel,
}: {
  record: CashCollection;
  busy?: boolean;
  onConfirm: (collected: number, note: string) => void;
  onCancel: () => void;
}) {
  const [collected, setCollected] = useState<string>(record.collected_etb ?? '0');
  const [note, setNote] = useState('');

  const expected = Number(record.expected_etb ?? 0);
  const entered = Number(collected);
  const shortfall = Number.isFinite(entered) ? Math.max(0, expected - entered) : 0;

  return (
    <Dialog
      eyebrow="Cash on hand"
      title={`Record cash for ${record.shipment_no}`}
      description={`We expect ${etb(record.expected_etb)}. Enter the amount the driver actually has. If it is less, we record the difference.`}
      onClose={() => { if (!busy) onCancel(); }}
      actions={
        <>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="fp-action-secondary !min-h-8 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(entered, note)}
            disabled={busy || !Number.isFinite(entered) || entered < 0}
            className="fp-action-primary !min-h-8 text-xs"
          >
            {busy ? 'Saving...' : 'Record cash'}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <label className="grid gap-1.5 text-xs font-medium text-[#454540]">
          Cash collected (ETB)
          <input
            autoFocus
            className="fp-input"
            type="number"
            min={0}
            step="0.01"
            value={collected}
            onChange={(e) => setCollected(e.target.value)}
          />
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-[#454540]">
          Note (optional)
          <textarea
            className="fp-input min-h-20 px-4 py-3"
            placeholder="Anything the office should know about this collection..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <p className={`text-xs ${shortfall > 0 ? 'text-[#885100]' : 'text-[#5f5f59]'}`}>
          {shortfall > 0
            ? `Shortfall of ${etb(shortfall)} will be recorded against this delivery.`
            : 'This clears the expected amount in full.'}
        </p>
      </div>
    </Dialog>
  );
}

export function SettleCashDialog({
  record,
  busy = false,
  onConfirm,
  onCancel,
}: {
  record: CashCollection;
  busy?: boolean;
  onConfirm: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState('');

  return (
    <Dialog
      eyebrow="Cash handover"
      title={`Settle cash for ${record.shipment_no}`}
      description="Use this after the office receives the cash. It closes the record and keeps any missing amount visible."
      onClose={() => { if (!busy) onCancel(); }}
      actions={
        <>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="fp-action-secondary !min-h-8 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm(note)}
            className="fp-action-primary !min-h-8 text-xs"
          >
            {busy ? 'Settling...' : 'Settle'}
          </button>
        </>
      }
    >
      <label className="grid gap-1.5 text-xs font-medium text-[#454540]">
        Settlement note (optional)
        <textarea
          autoFocus
          className="fp-input min-h-20 px-4 py-3"
          placeholder="e.g. Cash banked with the CBE deposit on Monday."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
    </Dialog>
  );
}

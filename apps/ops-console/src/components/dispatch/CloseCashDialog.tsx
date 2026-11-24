import type { Dispatch, FormEvent, SetStateAction } from 'react';

import type { DispatchRun } from '../../types/api';
import { Dialog } from '../ui/Dialog';

export type CashCloseFormState = {
  handed_over_etb: string;
  deposit_bank: '' | 'cbe' | 'dashen';
  deposit_reference: string;
  note: string;
};

type CloseCashDialogProps = {
  fieldClassName: string;
  target: DispatchRun;
  form: CashCloseFormState;
  onFormChange: Dispatch<SetStateAction<CashCloseFormState>>;
  error: string | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
};

export function CloseCashDialog({
  fieldClassName,
  target,
  form,
  onFormChange,
  error,
  busy,
  onClose,
  onSubmit,
}: CloseCashDialogProps) {
  return (
    <Dialog
      eyebrow="Cash handover"
      title="Close driver cash"
      description="Record what the office actually received and attach the bank deposit reference when available."
      onClose={() => { if (!busy) onClose(); }}
    >
      <form className="grid gap-3" onSubmit={onSubmit}>
        {error ? (
          <p role="alert" className="rounded-md border border-[#e7c2be] bg-[#fff8f7] px-3 py-2 text-xs text-[#8f302a]">
            {error}
          </p>
        ) : null}
        <div className="rounded-md bg-[#f7f7f5] px-3 py-2 text-xs text-[#454540]">
          Expected: <span className="font-semibold text-[#252522]">{target.expected_cash_etb} ETB</span>
          {target.cash_declared_etb ? (
            <span className="ml-3 text-[#5f5f59]">Declared: {target.cash_declared_etb} ETB</span>
          ) : null}
        </div>
        <label className="grid gap-1 text-xs text-[#454540]">
          Cash handed over
          <input
            className={fieldClassName}
            type="number"
            min="0"
            step="0.01"
            required
            value={form.handed_over_etb}
            onChange={(event) =>
              onFormChange((current) => ({
                ...current,
                handed_over_etb: event.target.value,
              }))
            }
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs text-[#454540]">
            Deposit bank
            <select
              className={fieldClassName}
              value={form.deposit_bank}
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  deposit_bank: event.target.value as '' | 'cbe' | 'dashen',
                }))
              }
            >
              <option value="">No deposit slip</option>
              <option value="cbe">CBE</option>
              <option value="dashen">Dashen</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs text-[#454540]">
            Deposit reference
            <input
              className={fieldClassName}
              maxLength={128}
              disabled={!form.deposit_bank}
              value={form.deposit_reference}
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  deposit_reference: event.target.value,
                }))
              }
            />
          </label>
        </div>
        <label className="grid gap-1 text-xs text-[#454540]">
          Close note
          <textarea
            className={`${fieldClassName} min-h-24 py-3`}
            maxLength={500}
            value={form.note}
            onChange={(event) =>
              onFormChange((current) => ({
                ...current,
                note: event.target.value,
              }))
            }
          />
        </label>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="fp-action-secondary !min-h-8 text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="fp-action-primary !min-h-8 text-xs"
          >
            {busy ? 'Closing...' : 'Close cash'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

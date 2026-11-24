import { useState } from 'react';

import type { VerifiedReceiptAudit } from '../../types/api';

type ReversalActionButtonsProps = {
  row: VerifiedReceiptAudit;
  onUndo: (row: VerifiedReceiptAudit, note: string) => Promise<boolean>;
  onReverse: (row: VerifiedReceiptAudit, reason: string) => Promise<boolean>;
};

export function ReversalActionButtons({ row, onUndo, onReverse }: ReversalActionButtonsProps) {
  const [mode, setMode] = useState<'idle' | 'undo' | 'reverse'>('idle');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
  const canSubmit = (isReverse ? text.trim().length > 0 : true) && !submitting;

  async function onSubmit() {
    setSubmitting(true);
    const ok = isReverse
      ? await onReverse(row, text.trim())
      : await onUndo(row, text.trim());
    setSubmitting(false);
    if (ok) {
      setMode('idle');
      setText('');
    }
  }

  return (
    <div className="w-full space-y-2">
      <textarea
        aria-label={isReverse ? 'Reason for reversal' : 'Note for undo'}
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
          onClick={() => void onSubmit()}
          className="fp-action-primary !min-h-8 !bg-[#a15b00] text-xs hover:!bg-[#885100]"
        >
          {submitting ? 'Saving...' : isReverse ? 'Reverse payment' : 'Undo payment'}
        </button>
        <button
          type="button"
          disabled={submitting}
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

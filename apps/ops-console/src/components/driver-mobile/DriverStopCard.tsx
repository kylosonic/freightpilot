import type { DispatchStop } from '../../types/api';
import type { DriverCopy } from './driverCopy';
import { formatEtbAmount, type QueueItem } from './driverStorage';

type DriverStopCardProps = {
  stop: DispatchStop;
  copy: DriverCopy;
  busy: boolean;
  cashValue: string | undefined;
  cashNote: string | undefined;
  hasQueuedProof: boolean;
  localizeStopStatus: (status: string) => string;
  onQueueOrRun: (item: QueueItem) => void;
  onCashValueChange: (value: string) => void;
  onCashNoteChange: (value: string) => void;
  onProofFileChange: (file: File | null) => void;
  onUploadProof: () => void;
};

export function DriverStopCard({
  stop,
  copy: t,
  busy,
  cashValue,
  cashNote,
  hasQueuedProof,
  localizeStopStatus,
  onQueueOrRun,
  onCashValueChange,
  onCashNoteChange,
  onProofFileChange,
  onUploadProof,
}: DriverStopCardProps) {
  return (
    <article className="rounded-lg border border-[#e5e4e0] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-[#73736e]">{t.stop} {stop.sequence} · {stop.order_no}</p>
          <h2 className="mt-1 text-lg font-semibold text-[#252522]">{stop.customer_name}</h2>
          <p className="mt-1 text-sm leading-6 text-[#5f5f59]">{stop.address}</p>
          {stop.phone ? <a href={`tel:${stop.phone}`} className="mt-1 block text-xs font-medium text-[#176b5c] underline">{stop.phone}</a> : null}
        </div>
        <span className="shrink-0 text-right font-mono text-sm tabular-nums text-[#454540]">{formatEtbAmount(stop.cod_amount_etb)}</span>
      </div>
      {stop.window_start || stop.window_end ? (
        <p className="mt-3 text-xs text-[#885100]">
          {stop.window_start ? new Date(stop.window_start).toLocaleTimeString() : '—'} – {stop.window_end ? new Date(stop.window_end).toLocaleTimeString() : '—'}
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={busy || stop.status === 'delivered'}
          onClick={() => onQueueOrRun({ kind: 'status', orderId: stop.order_id, status: 'in_transit' })}
          className={`min-h-9 rounded-md border px-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
            stop.status === 'in_transit'
              ? 'border-[#17679b] bg-[#edf5fa] text-[#17679b]'
              : 'border-[#bfd8e5] bg-white text-[#17679b] hover:bg-[#edf5fa]'
          }`}
        >
          {t.inTransit}
        </button>
        <button
          type="button"
          disabled={busy || stop.status === 'delivered'}
          onClick={() => onQueueOrRun({ kind: 'status', orderId: stop.order_id, status: 'delivered' })}
          className={`min-h-9 rounded-md border px-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
            stop.status === 'delivered'
              ? 'border-[#14745f] bg-[#edf7f1] text-[#14745f]'
              : 'border-[#b9dcd1] bg-white text-[#14745f] hover:bg-[#edf7f1]'
          }`}
        >
          {t.delivered}
        </button>
        <button
          type="button"
          disabled={busy || stop.status === 'delivered'}
          onClick={() => onQueueOrRun({ kind: 'status', orderId: stop.order_id, status: 'failed' })}
          className={`min-h-9 rounded-md border px-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
            stop.status === 'failed'
              ? 'border-[#a3342f] bg-[#fbf0ee] text-[#a3342f]'
              : 'border-[#e7c2be] bg-white text-[#a3342f] hover:bg-[#fbf0ee]'
          }`}
        >
          {t.failed}
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="text-xs font-medium text-[#5f5f59]">
          {t.cash}
          <input
            className="fp-input mt-1 min-h-10"
            type="number"
            min="0"
            step="0.01"
            value={cashValue ?? stop.collected_cash_etb}
            onChange={(event) => onCashValueChange(event.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onQueueOrRun({
              kind: 'cash',
              orderId: stop.order_id,
              amount: Number(cashValue ?? stop.collected_cash_etb),
              note: cashNote?.trim() || undefined,
            })
          }
          className="fp-action-primary self-end !text-xs"
        >
          {t.saveCash}
        </button>
      </div>
      <label className="mt-2 block text-xs font-medium text-[#5f5f59]">
        {t.cashNote}
        <input
          className="fp-input mt-1 min-h-10"
          value={cashNote ?? ''}
          onChange={(event) => onCashNoteChange(event.target.value)}
        />
      </label>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="text-xs font-medium text-[#5f5f59]">
          {t.proof}
          <input
            className="mt-1 block w-full text-xs text-[#454540]"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={(event) => onProofFileChange(event.target.files?.[0] ?? null)}
          />
        </label>
        <button
          type="button"
          disabled={busy || Boolean(stop.proof_id) || hasQueuedProof}
          onClick={onUploadProof}
          className="fp-action-secondary self-end !text-xs"
        >
          {stop.proof_id
            ? t.proofSaved
            : hasQueuedProof
              ? t.proofQueued
              : t.upload}
        </button>
      </div>
      <p className="mt-2 text-xs text-[#73736e]">
        {t.status}: {localizeStopStatus(stop.status)} · {t.collected}: {formatEtbAmount(stop.collected_cash_etb)}
      </p>
    </article>
  );
}

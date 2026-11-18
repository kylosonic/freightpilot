import { useEffect, useState } from 'react';

import {
  DriverRequestError,
  declareDriverCash,
  getDriverManifest,
  updateDriverOrderStatus,
  uploadDriverProof,
} from '../services/dispatchApi';
import {
  clearQueuedProofs,
  deleteQueuedProof,
  listQueuedProofs,
  pruneOtherProofScopes,
  queueDriverProof,
  type QueuedProof,
} from '../services/driverProofQueue';
import type { DriverManifest, DispatchStop } from '../types/api';

const MANIFEST_PREFIX = 'freightpilot_driver_manifest:';
const QUEUE_PREFIX = 'freightpilot_driver_queue:';
const MANIFEST_MAX_AGE_MS = 8 * 60 * 60 * 1000;

type CachedManifest = {
  stored_at: number;
  manifest: DriverManifest;
};

type QueueItem =
  | { kind: 'status'; orderId: string; status: 'in_transit' | 'delivered' | 'failed'; note?: string }
  | { kind: 'cash'; orderId: string; amount: number; note?: string };

const copy = {
  am: {
    title: 'የዛሬ ጉዞ',
    driver: 'አሽከርካሪ',
    start: 'መነሻ',
    stop: 'ጣቢያ',
    delivered: 'ደረሰ',
    inTransit: 'በመንገድ ላይ',
    failed: 'አልተሳካም',
    cash: 'የተሰበሰበ ገንዘብ',
    cashNote: 'ማብራሪያ (ለእጥረት አስፈላጊ)',
    saveCash: 'ገንዘብ አስቀምጥ',
    proof: 'የማስረከቢያ ፎቶ',
    upload: 'ፎቶ አስገባ',
    proofQueued: 'ፎቶ ተቀምጦ ይጠባበቃል',
    offline: 'ኦፍላይን — ለውጦች በኋላ ይላካሉ',
    online: 'ኦንላይን',
    sync: 'በመላክ ላይ…',
    noToken: 'ይህ የአሽከርካሪ ሊንክ አልተላከም። ከቢሮ አዲስ ሊንክ ይጠይቁ።',
    noStops: 'ዛሬ ምንም ጣቢያ የለም።',
    proofSaved: 'ፎቶው ተቀምጧል',
    queued: 'ይላካል',
    choosePhoto: 'መጀመሪያ ፎቶ ይምረጡ።',
    status: 'ሁኔታ',
    collected: 'የተሰበሰበ ገንዘብ',
  },
  en: {
    title: "Today's route",
    driver: 'Driver',
    start: 'Start',
    stop: 'Stop',
    delivered: 'Delivered',
    inTransit: 'In transit',
    failed: 'Failed',
    cash: 'Cash collected',
    cashNote: 'Note (required for a shortfall)',
    saveCash: 'Save cash',
    proof: 'Proof of delivery',
    upload: 'Upload photo',
    proofQueued: 'Proof queued',
    offline: 'Offline — changes will sync later',
    online: 'Online',
    sync: 'Syncing…',
    noToken: 'This driver link did not work. Ask the office for a new link.',
    noStops: 'No stops scheduled today.',
    proofSaved: 'Photo saved',
    queued: 'waiting to send',
    choosePhoto: 'Choose a photo first.',
    status: 'Status',
    collected: 'Cash collected',
  },
} as const;

function tokenHash(token: string): string {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function manifestKey(token: string): string {
  return `${MANIFEST_PREFIX}${tokenHash(token)}`;
}

function queueKey(token: string): string {
  return `${QUEUE_PREFIX}${tokenHash(token)}`;
}

function tokenExpiryMs(token: string): number | null {
  try {
    const encoded = token.split('.')[1];
    if (!encoded) return null;
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function readQueue(token: string): QueueItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(queueKey(token)) || '[]') as QueueItem[];
  } catch {
    return [];
  }
}

function writeQueue(token: string, queue: QueueItem[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(queueKey(token), JSON.stringify(queue));
}

function enqueue(token: string, item: QueueItem) {
  const withoutSuperseded = readQueue(token).filter(
    (queued) => !(queued.kind === item.kind && queued.orderId === item.orderId),
  );
  writeQueue(token, [...withoutSuperseded, item].slice(-100));
  return readQueue(token).length;
}

function pruneDriverStorage(token: string) {
  void pruneOtherProofScopes(tokenHash(token));
  if (typeof localStorage === 'undefined') return;
  const keepManifest = manifestKey(token);
  const keepQueue = queueKey(token);
  for (const key of Object.keys(localStorage)) {
    if (
      (key.startsWith(MANIFEST_PREFIX) && key !== keepManifest) ||
      (key.startsWith(QUEUE_PREFIX) && key !== keepQueue)
    ) {
      localStorage.removeItem(key);
    }
  }
}

export function DriverPage() {
  const fragment = typeof window === 'undefined' ? '' : window.location.hash.replace(/^#/, '');
  const fragmentToken = new URLSearchParams(fragment).get('token') || '';
  const token = fragmentToken;
  const [lang, setLang] = useState<'am' | 'en'>('am');
  const t = copy[lang];
  const [manifest, setManifest] = useState<DriverManifest | null>(null);
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cashValues, setCashValues] = useState<Record<string, string>>({});
  const [cashNotes, setCashNotes] = useState<Record<string, string>>({});
  const [proofFiles, setProofFiles] = useState<Record<string, File | null>>({});
  const [pendingCount, setPendingCount] = useState(() => readQueue(token).length);
  const [queuedProofs, setQueuedProofs] = useState<QueuedProof[]>([]);
  const proofScope = tokenHash(token);

  async function refreshProofQueue() {
    if (!token) {
      setQueuedProofs([]);
      return;
    }
    try {
      setQueuedProofs(await listQueuedProofs(proofScope));
    } catch {
      setQueuedProofs([]);
    }
  }

  async function loadManifest() {
    if (!token) {
      setError(t.noToken);
      return;
    }
    const manifestStorageKey = manifestKey(token);
    try {
      const next = await getDriverManifest(token);
      setManifest(next);
      const cached: CachedManifest = { stored_at: Date.now(), manifest: next };
      localStorage.setItem(manifestStorageKey, JSON.stringify(cached));
      setError(null);
    } catch (err) {
      if (
        err instanceof DriverRequestError &&
        [401, 403, 404, 410].includes(err.status)
      ) {
        localStorage.removeItem(manifestStorageKey);
        setManifest(null);
        setError(err.message);
        return;
      }
      const raw = localStorage.getItem(manifestStorageKey);
      if (raw) {
        try {
          const cached = JSON.parse(raw) as CachedManifest;
          if (
            cached.manifest &&
            Number.isFinite(cached.stored_at) &&
            Date.now() - cached.stored_at <= MANIFEST_MAX_AGE_MS &&
            (tokenExpiryMs(token) === null || Date.now() < (tokenExpiryMs(token) as number))
          ) {
            setManifest(cached.manifest);
            setNotice(t.offline);
            return;
          }
        } catch {
          // Corrupt or pre-v2 cache: remove it and fail closed.
        }
        localStorage.removeItem(manifestStorageKey);
      }
      setError(err instanceof Error ? err.message : 'Could not load the manifest.');
    }
  }

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/driver-sw.js', { scope: '/driver' });
    }
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    setManifest(null);
    pruneDriverStorage(token);
    setPendingCount(readQueue(token).length);
    void refreshProofQueue();
    void loadManifest();
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function syncQueue() {
    if (!online || !token) return;
    const queue = readQueue(token);
    let proofs: QueuedProof[] = [];
    try {
      proofs = await listQueuedProofs(proofScope);
    } catch {
      setError('Offline proof storage is unavailable on this device.');
      return;
    }
    if (queue.length === 0 && proofs.length === 0) return;
    setBusy(true);
    const remaining: QueueItem[] = [];
    let tokenInvalid = false;
    for (const item of queue) {
      try {
        if (item.kind === 'status') {
          await updateDriverOrderStatus(token, item.orderId, item.status, item.note);
        } else {
          await declareDriverCash(token, item.orderId, item.amount, item.note);
        }
      } catch (err) {
        if (
          err instanceof DriverRequestError &&
          [401, 403, 404, 410].includes(err.status)
        ) {
          writeQueue(token, []);
          setPendingCount(0);
          await clearQueuedProofs(proofScope);
          setQueuedProofs([]);
          localStorage.removeItem(manifestKey(token));
          setManifest(null);
          setError(err.message);
          tokenInvalid = true;
          break;
        }
        if (
          err instanceof DriverRequestError &&
          err.status >= 400 &&
          err.status < 500 &&
          err.status !== 429
        ) {
          setSyncError(`One queued update was rejected: ${err.message}`);
          continue;
        }
        remaining.push(item);
      }
    }
    writeQueue(token, remaining);
    setPendingCount(remaining.length);
    const remainingProofs: QueuedProof[] = [];
    if (!tokenInvalid) {
      for (const proof of proofs) {
        try {
          await uploadDriverProof(
            token,
            proof.orderId,
            proof.blob,
            proof.fileName,
            proof.recipientName,
            proof.notes,
          );
          await deleteQueuedProof(proof.id);
        } catch (err) {
          if (
            err instanceof DriverRequestError &&
            [401, 403, 404, 410].includes(err.status)
          ) {
            writeQueue(token, []);
            setPendingCount(0);
            await clearQueuedProofs(proofScope);
            setQueuedProofs([]);
            localStorage.removeItem(manifestKey(token));
            setManifest(null);
            setError(err.message);
            tokenInvalid = true;
            break;
          }
          if (
            err instanceof DriverRequestError &&
            err.status >= 400 &&
            err.status < 500 &&
            err.status !== 429
          ) {
            await deleteQueuedProof(proof.id);
            setSyncError(`One queued proof was rejected: ${err.message}`);
            continue;
          }
          remainingProofs.push(proof);
        }
      }
      setQueuedProofs(remainingProofs);
    }
    setBusy(false);
    if (!tokenInvalid && remaining.length === 0 && remainingProofs.length === 0) {
      setNotice(null);
      await loadManifest();
    }
  }

  useEffect(() => {
    void syncQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  function queueOrRun(item: QueueItem) {
    setSyncError(null);
    if (!online) {
      setPendingCount(enqueue(token, item));
      setNotice(t.offline);
      return;
    }
    setBusy(true);
    const action =
      item.kind === 'status'
        ? updateDriverOrderStatus(token, item.orderId, item.status, item.note)
        : declareDriverCash(token, item.orderId, item.amount, item.note);
    action
      .then(() => loadManifest())
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not save the update.'))
      .finally(() => setBusy(false));
  }

  async function onProof(stop: DispatchStop) {
    const file = proofFiles[stop.order_id];
    if (!file) {
      setError(t.choosePhoto);
      return;
    }
    if (!online) {
      try {
        await queueDriverProof({
          scope: proofScope,
          orderId: stop.order_id,
          file,
          fileName: file.name || 'proof.jpg',
        });
        setProofFiles((current) => ({ ...current, [stop.order_id]: null }));
        setNotice(t.proofQueued);
        await refreshProofQueue();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save proof offline.');
      }
      return;
    }
    setBusy(true);
    try {
      await uploadDriverProof(token, stop.order_id, file);
      setProofFiles((current) => ({ ...current, [stop.order_id]: null }));
      await loadManifest();
    } catch (err) {
      if (err instanceof DriverRequestError && err.status >= 400 && err.status < 500) {
        setError(err.message);
      } else {
        try {
          await queueDriverProof({
            scope: proofScope,
            orderId: stop.order_id,
            file,
            fileName: file.name || 'proof.jpg',
          });
          setProofFiles((current) => ({ ...current, [stop.order_id]: null }));
          setNotice(t.proofQueued);
          await refreshProofQueue();
        } catch (queueError) {
          setError(
            queueError instanceof Error
              ? queueError.message
              : 'Could not save proof offline.',
          );
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-3 py-5 text-[#252522]">
      <div className="mx-auto max-w-2xl space-y-3">
        <header className="rounded-lg border border-[#e5e4e0] bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[#73736e]">FreightPilot</p>
              <h1 className="mt-1 text-2xl font-semibold text-[#252522]">{t.title}</h1>
              {manifest ? <p className="mt-1 text-xs text-[#63766f]">{manifest.driver_name} · {manifest.start_label}</p> : null}
            </div>
            <button type="button" onClick={() => setLang(lang === 'am' ? 'en' : 'am')} className="min-h-9 rounded-full border border-[#d7d7d2] bg-white px-3 text-xs font-medium text-[#454540]">
              {lang === 'am' ? 'EN' : 'አማ'}
            </button>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 text-xs">
            <span className={online ? 'text-[#14745f]' : 'text-[#885100]'}>{online ? t.online : t.offline}</span>
            {pendingCount + queuedProofs.length > 0 ? <span className="text-[#885100]">{pendingCount + queuedProofs.length} {t.queued}</span> : null}
            {busy ? <span className="text-[#17679b]">{t.sync}</span> : null}
          </div>
        </header>

        {error ? <p role="alert" className="rounded-md bg-[#fff8f7] p-3 text-sm leading-6 text-[#8f302a]">{error}</p> : null}
        {syncError ? <p role="alert" className="rounded-md bg-[#fff8f7] p-3 text-sm leading-6 text-[#8f302a]">{syncError}</p> : null}
        {notice ? <p role="status" className="rounded-md bg-[#fffaf0] p-3 text-sm leading-6 text-[#704500]">{notice}</p> : null}

        {manifest?.stops.length === 0 ? <p className="rounded-lg border border-[#e5e4e0] bg-white p-4 text-sm text-[#73736e]">{t.noStops}</p> : null}

        <div className="space-y-3">
          {manifest?.stops.map((stop) => (
            <article key={stop.order_id} className="rounded-lg border border-[#e5e4e0] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-[#73736e]">Stop {stop.sequence} · {stop.order_no}</p>
                  <h2 className="mt-1 text-lg font-semibold text-[#252522]">{stop.customer_name}</h2>
                  <p className="mt-1 text-sm leading-6 text-[#5f5f59]">{stop.address}</p>
                  {stop.phone ? <a href={`tel:${stop.phone}`} className="mt-1 block text-xs font-medium text-[#087f72] underline">{stop.phone}</a> : null}
                </div>
                <span className="shrink-0 text-right font-mono text-sm text-[#454540]">{stop.cod_amount_etb} ETB</span>
              </div>
              {stop.window_start || stop.window_end ? (
                <p className="mt-3 text-xs text-[#885100]">
                  {stop.window_start ? new Date(stop.window_start).toLocaleTimeString() : '—'} – {stop.window_end ? new Date(stop.window_end).toLocaleTimeString() : '—'}
                </p>
              ) : null}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button type="button" disabled={busy || stop.status === 'delivered'} onClick={() => queueOrRun({ kind: 'status', orderId: stop.order_id, status: 'in_transit' })} className="min-h-9 border border-[#bfd8e5] bg-white px-2 text-[11px] font-semibold text-[#17679b] disabled:opacity-40">{t.inTransit}</button>
                <button type="button" disabled={busy || stop.status === 'delivered'} onClick={() => queueOrRun({ kind: 'status', orderId: stop.order_id, status: 'delivered' })} className="min-h-9 border border-[#b9dcd1] bg-white px-2 text-[11px] font-semibold text-[#14745f] disabled:opacity-40">{t.delivered}</button>
                <button type="button" disabled={busy || stop.status === 'delivered'} onClick={() => queueOrRun({ kind: 'status', orderId: stop.order_id, status: 'failed' })} className="min-h-9 border border-[#e7c2be] bg-white px-2 text-[11px] font-semibold text-[#a3342f] disabled:opacity-40">{t.failed}</button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <label className="text-xs text-[#63766f]">
                  {t.cash}
                  <input
                    className="fp-input mt-1 min-h-9"
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashValues[stop.order_id] ?? stop.collected_cash_etb}
                    onChange={(event) => setCashValues((current) => ({ ...current, [stop.order_id]: event.target.value }))}
                  />
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    queueOrRun({
                      kind: 'cash',
                      orderId: stop.order_id,
                      amount: Number(cashValues[stop.order_id] ?? stop.collected_cash_etb),
                      note: cashNotes[stop.order_id]?.trim() || undefined,
                    })
                  }
                  className="fp-action-primary self-end !min-h-9 !text-xs"
                >
                  {t.saveCash}
                </button>
              </div>
              <label className="mt-2 block text-xs text-[#63766f]">
                {t.cashNote}
                <input
                  className="fp-input mt-1 min-h-9"
                  value={cashNotes[stop.order_id] ?? ''}
                  onChange={(event) =>
                    setCashNotes((current) => ({
                      ...current,
                      [stop.order_id]: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <label className="text-xs text-[#63766f]">
                  {t.proof}
                  <input
                    className="mt-1 block w-full text-xs text-[#40534c]"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    onChange={(event) => setProofFiles((current) => ({ ...current, [stop.order_id]: event.target.files?.[0] ?? null }))}
                  />
                </label>
                <button type="button" disabled={busy || Boolean(stop.proof_id) || queuedProofs.some((proof) => proof.orderId === stop.order_id)} onClick={() => void onProof(stop)} className="min-h-9 self-end border border-[#cfd9d5] bg-white px-3 text-xs font-semibold text-[#40534c] disabled:opacity-40">
                  {stop.proof_id
                    ? t.proofSaved
                    : queuedProofs.some((proof) => proof.orderId === stop.order_id)
                      ? t.proofQueued
                      : t.upload}
                </button>
              </div>
              <p className="mt-2 text-xs text-[#73736e]">{t.status}: {stop.status} · {t.collected}: {stop.collected_cash_etb} ETB</p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

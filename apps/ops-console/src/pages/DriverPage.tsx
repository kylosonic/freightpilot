import { useEffect, useState } from 'react';

import { copy, type DriverLang } from '../components/driver-mobile/driverCopy';
import { DriverStopCard } from '../components/driver-mobile/DriverStopCard';
import {
  MANIFEST_MAX_AGE_MS,
  MANIFEST_PREFIX,
  QUEUE_PREFIX,
  type CachedManifest,
  type QueueItem,
  enqueue,
  isTerminalDriverError,
  isTerminalManifestError,
  manifestKey,
  pruneDriverStorage,
  readQueue,
  shouldQueueRequestError,
  tokenExpiryMs,
  tokenHash,
  writeQueue,
} from '../components/driver-mobile/driverStorage';
import {
  DriverRequestError,
  declareDriverCash,
  getDriverManifest,
  updateDriverOrderStatus,
  uploadDriverProof,
} from '../services/dispatchApi';
import {
  clearAllQueuedProofs,
  clearQueuedProofs,
  deleteQueuedProof,
  listQueuedProofs,
  queueDriverProof,
  type QueuedProof,
} from '../services/driverProofQueue';
import type { DispatchStop, DriverManifest } from '../types/api';

export function DriverPage() {
  const [token] = useState(() => {
    if (typeof window === 'undefined') return '';
    const fragment = window.location.hash.replace(/^#/, '');
    return new URLSearchParams(fragment).get('token') || '';
  });
  const [lang, setLang] = useState<DriverLang>('am');
  const t = copy[lang];
  const [manifest, setManifest] = useState<DriverManifest | null>(null);
  const [loadingManifest, setLoadingManifest] = useState(Boolean(token));
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
  const [pendingCount, setPendingCount] = useState(0);
  const [queuedProofs, setQueuedProofs] = useState<QueuedProof[]>([]);
  const proofScope = tokenHash(token);

  function localizeStopStatus(status: string): string {
    if (status === 'in_transit') return t.inTransit;
    if (status === 'delivered') return t.delivered;
    if (status === 'failed') return t.failed;
    if (status === 'planned') return t.planned;
    return status.replace(/_/g, ' ');
  }

  async function clearDriverSession(message: string) {
    writeQueue(token, []);
    setPendingCount(0);
    try {
      await clearQueuedProofs(proofScope);
    } catch {
      // Storage may already be unavailable; the visible state still resets.
    }
    setQueuedProofs([]);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(manifestKey(token));
    }
    setManifest(null);
    setError(message);
  }

  async function clearDeviceData() {
    if (!window.confirm(t.clearDeviceConfirm)) return;
    setBusy(true);
    let clearFailed = false;
    try {
      writeQueue(token, []);
      try {
        await clearAllQueuedProofs();
      } catch {
        clearFailed = true;
      }
      if (typeof localStorage !== 'undefined') {
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith(MANIFEST_PREFIX) || key.startsWith(QUEUE_PREFIX)) {
            localStorage.removeItem(key);
          }
        }
      }
      if (typeof caches !== 'undefined') {
        try {
          const keys = await caches.keys();
          await Promise.all(
            keys
              .filter((key) => key.startsWith('freightpilot-driver-'))
              .map((key) => caches.delete(key)),
          );
        } catch {
          clearFailed = true;
        }
      }
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      setManifest(null);
      setPendingCount(0);
      setQueuedProofs([]);
      setSyncError(null);
      setNotice(null);
      setError(null);
      if (clearFailed) {
        setError(t.deviceClearFailed);
      } else {
        setNotice(t.deviceCleared);
      }
    } catch {
      setError(t.deviceClearFailed);
    } finally {
      setBusy(false);
    }
  }

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
      setLoadingManifest(false);
      setError(t.noToken);
      return;
    }
    setLoadingManifest(true);
    const manifestStorageKey = manifestKey(token);
    try {
      const next = await getDriverManifest(token);
      setManifest(next);
      const cached: CachedManifest = { stored_at: Date.now(), manifest: next };
      localStorage.setItem(manifestStorageKey, JSON.stringify(cached));
      setError(null);
    } catch (err) {
      if (isTerminalManifestError(err)) {
        await clearDriverSession(err.message);
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
    } finally {
      setLoadingManifest(false);
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
    if (token) {
      pruneDriverStorage(token);
      setPendingCount(readQueue(token).length);
    } else {
      setPendingCount(0);
    }
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
    const remainingProofs: QueuedProof[] = [];
    let tokenInvalid = false;
    try {
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
            isTerminalDriverError(err)
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
              isTerminalDriverError(err)
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
      if (!tokenInvalid && remaining.length === 0 && remainingProofs.length === 0) {
        setNotice(null);
        await loadManifest();
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Queued updates could not be sent.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void syncQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  async function queueOrRun(item: QueueItem) {
    setError(null);
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
    try {
      await action;
      await loadManifest();
    } catch (err) {
      if (isTerminalDriverError(err)) {
        await clearDriverSession(err.message);
      } else if (shouldQueueRequestError(err)) {
        setPendingCount(enqueue(token, item));
        setNotice(t.offline);
      } else {
        setSyncError(err instanceof Error ? err.message : 'Could not save the update.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function onProof(stop: DispatchStop) {
    setError(null);
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
      if (isTerminalDriverError(err)) {
        await clearDriverSession(err.message);
      } else if (shouldQueueRequestError(err)) {
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
      } else {
        setError(err instanceof Error ? err.message : 'Could not upload the proof.');
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
              <div className="inline-flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-[#2e4f47] text-[10px] font-semibold text-white">FP</span>
                <p className="text-xs font-medium text-[#73736e]">FreightPilot</p>
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-[#252522]">{t.title}</h1>
              {manifest ? (
                <p className="mt-1 text-xs text-[#5f5f59]">
                  {manifest.driver_name} · {manifest.start_label}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setLang(lang === 'am' ? 'en' : 'am')}
              className="fp-action-secondary !min-h-8 !px-3 !text-xs"
            >
              {lang === 'am' ? 'EN' : 'አማ'}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className={online ? 'text-[#14745f]' : 'text-[#885100]'}>{online ? t.online : t.offline}</span>
            {pendingCount + queuedProofs.length > 0 ? <span className="text-[#885100]">{pendingCount + queuedProofs.length} {t.queued}</span> : null}
            {busy ? <span className="text-[#17679b]">{t.sync}</span> : null}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void clearDeviceData()}
            className="mt-3 inline-flex min-h-8 items-center justify-center rounded-md border border-[#e7c2be] bg-white px-3 text-xs font-medium text-[#8f302a] transition-colors hover:bg-[#fff8f7] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t.clearDevice}
          </button>
        </header>

        {error ? <p role="alert" className="rounded-md border border-[#e7c2be] bg-[#fff8f7] p-3 text-sm leading-6 text-[#8f302a]">{error}</p> : null}
        {syncError ? <p role="alert" className="rounded-md border border-[#e7c2be] bg-[#fff8f7] p-3 text-sm leading-6 text-[#8f302a]">{syncError}</p> : null}
        {notice ? <p role="status" className="rounded-md border border-[#e5d2ab] bg-[#fcf5e7] p-3 text-sm leading-6 text-[#885100]">{notice}</p> : null}

        {loadingManifest && !manifest ? (
          <div role="status" className="space-y-3 rounded-lg border border-[#e5e4e0] bg-white p-4">
            <p className="text-sm text-[#5f5f59]">{t.loading}</p>
            <div className="skeleton h-24" />
          </div>
        ) : null}

        {manifest?.stops.length === 0 ? <p className="rounded-lg border border-[#e5e4e0] bg-white p-4 text-sm text-[#5f5f59]">{t.noStops}</p> : null}

        <div className="space-y-3">
          {manifest?.stops.map((stop) => (
            <DriverStopCard
              key={stop.order_id}
              stop={stop}
              copy={t}
              busy={busy}
              cashValue={cashValues[stop.order_id]}
              cashNote={cashNotes[stop.order_id]}
              hasQueuedProof={queuedProofs.some((proof) => proof.orderId === stop.order_id)}
              localizeStopStatus={localizeStopStatus}
              onQueueOrRun={(item) => void queueOrRun(item)}
              onCashValueChange={(value) => setCashValues((current) => ({ ...current, [stop.order_id]: value }))}
              onCashNoteChange={(value) => setCashNotes((current) => ({ ...current, [stop.order_id]: value }))}
              onProofFileChange={(file) => setProofFiles((current) => ({ ...current, [stop.order_id]: file }))}
              onUploadProof={() => void onProof(stop)}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

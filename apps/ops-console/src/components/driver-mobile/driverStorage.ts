import { DriverRequestError } from '../../services/dispatchApi';
import { pruneOtherProofScopes } from '../../services/driverProofQueue';
import type { DriverManifest } from '../../types/api';

export const MANIFEST_PREFIX = 'freightpilot_driver_manifest:';
export const QUEUE_PREFIX = 'freightpilot_driver_queue:';
export const MANIFEST_MAX_AGE_MS = 8 * 60 * 60 * 1000;

export type CachedManifest = {
  stored_at: number;
  manifest: DriverManifest;
};

export type QueueItem =
  | { kind: 'status'; orderId: string; status: 'in_transit' | 'delivered' | 'failed'; note?: string }
  | { kind: 'cash'; orderId: string; amount: number; note?: string };

export function tokenHash(token: string): string {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function manifestKey(token: string): string {
  return `${MANIFEST_PREFIX}${tokenHash(token)}`;
}

export function queueKey(token: string): string {
  return `${QUEUE_PREFIX}${tokenHash(token)}`;
}

export function tokenExpiryMs(token: string): number | null {
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

export function readQueue(token: string): QueueItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(queueKey(token)) || '[]') as QueueItem[];
  } catch {
    return [];
  }
}

export function writeQueue(token: string, queue: QueueItem[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(queueKey(token), JSON.stringify(queue));
}

export function enqueue(token: string, item: QueueItem) {
  const withoutSuperseded = readQueue(token).filter(
    (queued) => !(queued.kind === item.kind && queued.orderId === item.orderId),
  );
  writeQueue(token, [...withoutSuperseded, item].slice(-100));
  return readQueue(token).length;
}

export function pruneDriverStorage(token: string) {
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

export function shouldQueueRequestError(error: unknown): boolean {
  if (!(error instanceof DriverRequestError)) return true;
  return error.status === 429 || error.status >= 500;
}

export function isTerminalDriverError(error: unknown): error is DriverRequestError {
  return (
    error instanceof DriverRequestError &&
    [401, 403, 410].includes(error.status)
  );
}

export function isTerminalManifestError(error: unknown): error is DriverRequestError {
  return isTerminalDriverError(error) || (error instanceof DriverRequestError && error.status === 404);
}

export function formatEtbAmount(value: number | string | null | undefined): string {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return `${value ?? '0.00'} ETB`;
  return `${numeric.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;
}

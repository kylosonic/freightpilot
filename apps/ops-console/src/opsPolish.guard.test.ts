import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('.', import.meta.url));

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

describe('ops-console reliability polish', () => {
  it('scrubs invitation tokens from the address bar after mount', () => {
    const source = read('pages/AcceptInvitePage.tsx');
    expect(source).toContain('useEffect(');
    expect(source).toContain('window.history.replaceState');
    expect(source).toContain("new URLSearchParams(window.location.hash.replace(/^#/, ''))");
  });

  it('creates the live invalidator inside the effect so StrictMode remounts recover', () => {
    const source = read('hooks/queries.ts');
    expect(source).toContain('const invalidator = createCoalescedInvalidator');
    expect(source).toContain('invalidatorRef.current = invalidator');
    expect(source).not.toContain('if (invalidatorRef.current === null)');
  });

  it('retries IndexedDB opens after errors or blocked upgrades', () => {
    const source = read('services/driverProofQueue.ts');
    expect(source).toContain('dbPromise = null');
    expect(source).toContain('request.onblocked');
  });

  it('clears shared-device data and queues transient driver updates', () => {
    const source = read('pages/DriverPage.tsx');
    const resetSource = source.slice(
      source.indexOf('async function clearDeviceData()'),
      source.indexOf('async function refreshProofQueue()'),
    );
    const syncSource = source.slice(
      source.indexOf('async function syncQueue()'),
      source.indexOf('useEffect(', source.indexOf('async function syncQueue()')),
    );
    expect(source).toContain('clearDeviceData');
    expect(source).toContain('clearAllQueuedProofs');
    expect(source).toContain('shouldQueueRequestError');
    expect(source).toContain('isTerminalDriverError');
    expect(source).toContain('isTerminalManifestError');
    expect(source).toContain('window.history.replaceState');
    expect(source).toContain('const [token] = useState(() => {');
    expect(source).not.toContain('const fragmentToken');
    expect(resetSource).toContain('setError(null);');
    expect(resetSource.indexOf('setError(null);')).toBeLessThan(
      resetSource.indexOf('setNotice(t.deviceCleared);'),
    );
    expect(syncSource).toContain('} finally {');
    expect(syncSource).toContain('setBusy(false);');
  });

  it('bumps the driver service-worker cache after the data contract change', () => {
    expect(read('../public/driver-sw.js')).toContain("const CACHE = 'freightpilot-driver-v2'");
  });
});

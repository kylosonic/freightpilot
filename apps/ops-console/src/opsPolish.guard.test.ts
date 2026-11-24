import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('.', import.meta.url));

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (!entry.name.includes('.test.') && /\.(ts|tsx|css)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
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

  it('enforces warm neutral tokens, accessible Dialog semantics, and avoids native alert/confirm in admin surfaces', () => {
    const forbiddenTokens = [
      '#85857e',
      '#6b7d76',
      'text-red-500',
      'text-green-500',
      '#172a24',
      '#20372f',
      '#202b36',
      '#25483f',
      '#40534c',
      '#52665e',
      '#5b6d66',
      '#63766f',
      '#d7dfdc',
      '#cfd9d5',
      '#e6ebe8',
      '#c8d4cf',
      '#eef3f0',
      '#f8faf9',
      '#f5f8f6',
      '#f4f6f5',
      '#153f3a',
      '#06675d',
    ];

    for (const file of collectSourceFiles(ROOT)) {
      const text = readFileSync(file, 'utf8');
      for (const token of forbiddenTokens) {
        expect(text, `${file} still contains ${token}`).not.toContain(token);
      }
      expect(text, `${file} uses native window.alert`).not.toMatch(/\b(?:window\.)?alert\(/);
    }

    for (const pagePath of ['components/TeamPanel.tsx', 'pages/ProvidersPage.tsx', 'pages/AdminReceiptsPage.tsx', 'components/receipts/ReceiptReviewDetailPane.tsx']) {
      expect(read(pagePath)).not.toContain('confirm(');
    }

    const dialog = read('components/ui/Dialog.tsx');
    expect(dialog).toContain('role="dialog"');
    expect(dialog).toContain('aria-modal="true"');
    expect(dialog).toContain('aria-labelledby');
    expect(dialog).toContain('Escape');
  });
});

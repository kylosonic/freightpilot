import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from './api';
import { getReceiptFileUrl } from './receiptsApi';

const noopStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
  clear: () => undefined,
};

function stubBlob(type: string) {
  api.defaults.adapter = async (config) => ({
    data: new Blob(['receipt'], { type }),
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });
}

beforeEach(() => {
  vi.stubGlobal('sessionStorage', noopStorage);
  vi.stubGlobal('localStorage', noopStorage);
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:receipt') });
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete api.defaults.adapter;
});

describe('receipt file client', () => {
  it('creates preview URLs only for approved receipt MIME types', async () => {
    stubBlob('image/png');
    await expect(getReceiptFileUrl('receipt-1')).resolves.toBe('blob:receipt');

    stubBlob('text/html');
    await expect(getReceiptFileUrl('receipt-2')).rejects.toThrow('not allowed');
  });
});

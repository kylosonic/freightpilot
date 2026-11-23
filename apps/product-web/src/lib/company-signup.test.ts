import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  companySignup,
  missingPlatformApiMessage,
  resolvePlatformApiBase,
} from './company-signup';
import { networkFailureMessage } from './site-content';

describe('resolvePlatformApiBase', () => {
  it('uses the configured API URL and trims a trailing slash', () => {
    expect(resolvePlatformApiBase('https://api.example.com/api/v1/', 'production')).toBe(
      'https://api.example.com/api/v1',
    );
  });

  it('falls back to localhost during non-production development', () => {
    expect(resolvePlatformApiBase(undefined, 'development')).toBe('http://localhost:8000/api/v1');
  });

  it('throws a clear deployment error in production when the API URL is missing', () => {
    expect(() => resolvePlatformApiBase(undefined, 'production')).toThrow(missingPlatformApiMessage);
  });

  it('treats a whitespace-only configured URL as missing in production', () => {
    expect(() => resolvePlatformApiBase('   ', 'production')).toThrow(missingPlatformApiMessage);
    expect(resolvePlatformApiBase('   ', 'development')).toBe('http://localhost:8000/api/v1');
  });

  it('posts to the resolved API base URL and surfaces server errors', async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'u-1', email: 'owner@acme.com' } }),
      text: async () => '',
    });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => null,
      text: async () => JSON.stringify({ detail: 'Email already registered' }),
    });
    vi.stubEnv('NEXT_PUBLIC_PLATFORM_API_URL', 'https://api.example.com/api/v1/');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubGlobal('fetch', fetchMock);

    const payload = {
      company_name: 'Acme Logistics',
      company_email: 'owner@acme.com',
      password: 'VeryStrongPass9',
    };

    const result = await companySignup(payload);
    expect(result).toEqual({ user_id: 'u-1', email: 'owner@acme.com' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/auth/company-signup',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        signal: expect.any(AbortSignal),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    );

    await expect(companySignup(payload)).rejects.toThrow('Email already registered');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('aborts a signup request that takes too long', async () => {
    vi.useFakeTimers();
    vi.stubEnv('NEXT_PUBLIC_PLATFORM_API_URL', 'https://api.example.com/api/v1');
    vi.stubEnv('NODE_ENV', 'production');
    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const request = companySignup({
      company_name: 'Acme Logistics',
      company_email: 'owner@acme.com',
      password: 'VeryStrongPass9',
    });
    const rejection = expect(request).rejects.toThrow(networkFailureMessage);
    await vi.advanceTimersByTimeAsync(15_000);

    await rejection;
  });
});

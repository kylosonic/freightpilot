import { describe, expect, it } from 'vitest';

import { safeConsoleRedirect } from './signup-form';

describe('safeConsoleRedirect', () => {
  it('allows HTTPS console URLs', () => {
    expect(safeConsoleRedirect('https://freightpilot-ops.pages.dev/login', 'production')).toBe(
      'https://freightpilot-ops.pages.dev/login',
    );
  });

  it('allows loopback HTTP only outside production', () => {
    expect(safeConsoleRedirect('http://localhost:5173/login', 'development')).toBe(
      'http://localhost:5173/login',
    );
    expect(safeConsoleRedirect('http://localhost:5173/login', 'production')).toBe('');
    expect(safeConsoleRedirect('http://[::1]:5173/login', 'development')).toBe(
      'http://[::1]:5173/login',
    );
  });

  it('rejects unsafe protocols, credentials, and malformed values', () => {
    expect(safeConsoleRedirect('javascript:alert(1)', 'production')).toBe('');
    expect(safeConsoleRedirect('https://user:pass@example.com', 'production')).toBe('');
    expect(safeConsoleRedirect('not a url', 'production')).toBe('');
  });
});

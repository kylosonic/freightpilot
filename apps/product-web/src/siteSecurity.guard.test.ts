import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url));

function read(relativePath: string): string {
  return readFileSync(join(APP_ROOT, relativePath), 'utf8');
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

describe('product-site polish guards', () => {
  it('keeps production CSP limited to assets the site uses', () => {
    const headers = read('public/_headers');
    const nginx = read('nginx.conf.template');
    for (const text of [headers, nginx]) {
      expect(text).not.toContain('fonts.gstatic.com');
      expect(text).not.toContain('wss://freightpilot-api.freightpilot.workers.dev');
      expect(text).toContain("img-src 'self' data: blob:;");
    }
  });

  it('keeps launch pages indexable and present in the sitemap', () => {
    expect(read('public/robots.txt')).not.toContain('Disallow: /launch');
    expect(read('src/app/sitemap.ts')).toContain('/launch');
  });

  it('matches documented CSV fields and footer anchors', () => {
    const docs = read('src/app/docs/page.tsx');
    expect(docs).toContain('unit_cost');
    expect(docs).toContain('unit_price');

    const content = read('src/lib/site-content.ts');
    for (const anchor of ['control-tower', 'decision-studio', 'launch-workstation']) {
      expect(content).toContain(`id: '${anchor}'`);
    }
    expect(read('src/app/platform/page.tsx')).toContain('id="revenue-guard"');
  });

  it('uses warm stone tokens, normalized active nav paths, and reduced-motion guards', () => {
    const forbiddenTokens = ['#85857e', '#6b7d76', '#172a24', '#20372f', '#202b36', '#d7dfdc', '#cfd9d5', '#e6ebe8'];
    for (const file of collectSourceFiles(join(APP_ROOT, 'src'))) {
      const text = readFileSync(file, 'utf8');
      for (const token of forbiddenTokens) {
        expect(text, `${file} still contains ${token}`).not.toContain(token);
      }
    }

    const chrome = read('src/components/site/site-chrome.tsx');
    expect(chrome).toContain('function normalizePath(');
    expect(chrome).toContain("pathname.replace(/\\/+$/, '')");
    expect(chrome).toContain('useReducedMotion');
    expect(read('src/components/site/hero-entrance.tsx')).toContain('useReducedMotion');
  });

  it('ships valid Open Graph and touch PNG assets with cache-busted layout metadata', () => {
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const expectedAssets = [
      { path: 'public/og-image.png', width: 1200, height: 630 },
      { path: 'public/apple-touch-icon.png', width: 180, height: 180 },
    ];

    for (const asset of expectedAssets) {
      const buf = readFileSync(join(APP_ROOT, asset.path));
      expect(buf.subarray(0, 8).equals(pngSignature), `${asset.path} PNG signature`).toBe(true);
      expect(buf.subarray(12, 16).toString('ascii'), `${asset.path} IHDR chunk`).toBe('IHDR');
      expect(buf.readUInt32BE(16), `${asset.path} width`).toBe(asset.width);
      expect(buf.readUInt32BE(20), `${asset.path} height`).toBe(asset.height);
    }

    const layout = read('src/app/layout.tsx');
    expect(layout).toContain("'/og-image.png?v=2'");
    expect(layout).toContain("'/apple-touch-icon.png?v=2'");
  });
});

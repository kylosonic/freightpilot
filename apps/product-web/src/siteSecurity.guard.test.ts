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
});

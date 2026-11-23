import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url));

function read(relativePath: string): string {
  return readFileSync(join(APP_ROOT, relativePath), 'utf8');
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
});

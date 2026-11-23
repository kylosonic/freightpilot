const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const src = path.join(__dirname, '..', 'src');
const html = fs.readFileSync(path.join(src, 'onboarding.html'), 'utf8');
const css = fs.readFileSync(path.join(src, 'onboarding.css'), 'utf8');
const script = fs.readFileSync(path.join(src, 'onboarding.js'), 'utf8');
const main = fs.readFileSync(path.join(src, 'main.cjs'), 'utf8');

test('onboarding uses a strict local-only content security policy', () => {
  assert.match(
    html,
    /default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none';/,
  );
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)/i);
  assert.doesNotMatch(html, /style=/i);
  assert.doesNotMatch(css, /@import|fonts\.googleapis|fonts\.gstatic/i);
});

test('onboarding avoids HTML injection primitives', () => {
  assert.doesNotMatch(script, /\binnerHTML\b|\bouterHTML\b|insertAdjacentHTML/);
});

test('desktop windows disable DevTools for packaged builds', () => {
  assert.equal((main.match(/devTools: !app\.isPackaged/g) || []).length, 2);
});

test('desktop onboarding step is clamped to the five defined steps', () => {
  assert.equal((main.match(/Math\.min\(4,/g) || []).length, 2);
  assert.doesNotMatch(main, /Math\.min\(8,/);
});

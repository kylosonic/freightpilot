const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { isExactFileUrl } = require('../src/file-url.cjs');

test('accepts the exact onboarding file URL', () => {
  const expected = path.join(__dirname, '..', 'src', 'onboarding.html');
  const url = new URL(`file://${expected}`).href;
  assert.equal(isExactFileUrl(url, expected), true);
});

test('rejects a different local file', () => {
  const expected = path.join(__dirname, '..', 'src', 'onboarding.html');
  const other = path.join(__dirname, '..', 'src', 'preload.cjs');
  assert.equal(isExactFileUrl(new URL(`file://${other}`).href, expected), false);
});

test('handles Windows drive-letter paths without doubling the drive', () => {
  assert.equal(
    isExactFileUrl(
      'file:///C:/Users/Nahom/App%20Data/Local/FreightPilot/onboarding.html',
      'C:\\Users\\Nahom\\App Data\\Local\\FreightPilot\\onboarding.html',
      'win32',
    ),
    true,
  );
});

test('rejects non-file URLs', () => {
  assert.equal(isExactFileUrl('https://example.com/onboarding.html', '/tmp/onboarding.html'), false);
});

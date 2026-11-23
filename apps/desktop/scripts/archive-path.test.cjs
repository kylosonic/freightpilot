const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { assertSymlinkTargetInside, safeArchivePath } = require('./archive-path.cjs');

const root = path.resolve('extract-root');

test('resolves nested archive paths inside the destination', () => {
  assert.equal(safeArchivePath(root, 'electron.exe'), path.join(root, 'electron.exe'));
  assert.equal(
    safeArchivePath(root, 'resources/app.asar'),
    path.join(root, 'resources', 'app.asar'),
  );
});

test('rejects absolute and parent-traversing archive paths', () => {
  assert.throws(() => safeArchivePath(root, '../outside'));
  assert.throws(() => safeArchivePath(root, 'folder/../../outside'));
  assert.throws(() => safeArchivePath(root, '/absolute'));
  assert.throws(() => safeArchivePath(root, 'C:\\absolute'));
});

test('rejects symlink targets that resolve outside the extraction root', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'freightpilot-symlink-'));
  const destination = path.join(tempRoot, 'destination');
  const outside = path.join(tempRoot, 'outside');
  fs.mkdirSync(destination);
  fs.mkdirSync(outside);
  const escapingLink = path.join(destination, 'escape');
  fs.symlinkSync(outside, escapingLink, 'dir');

  try {
    assert.throws(
      () => assertSymlinkTargetInside(destination, escapingLink, 'resources/escape'),
      /escapes the destination/,
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

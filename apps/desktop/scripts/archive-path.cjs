const path = require('path');
const fs = require('fs');

function assertNoSymlinkAncestors(root, destination, entryName) {
  const relative = path.relative(root, destination);
  const parts = relative.split(path.sep).filter(Boolean);
  let current = root;
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index]);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) {
        throw new Error(`Archive entry crosses a symlink: ${entryName}`);
      }
    } catch (error) {
      if (error && error.code === 'ENOENT') return;
      throw error;
    }
  }
}

function safeArchivePath(root, entryName) {
  const normalized = entryName.replaceAll('\\', '/');
  const segments = normalized.split('/').filter(Boolean);
  if (
    normalized.startsWith('/') ||
    /^[A-Za-z]:/.test(normalized) ||
    segments.some((segment) => segment === '..')
  ) {
    throw new Error(`Unsafe path in Electron archive: ${entryName}`);
  }
  const destination = path.resolve(root, ...segments);
  const relative = path.relative(root, destination);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Archive entry escapes the destination: ${entryName}`);
  }
  assertNoSymlinkAncestors(root, destination, entryName);
  return destination;
}

module.exports = { safeArchivePath };

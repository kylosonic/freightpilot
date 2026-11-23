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

function assertSymlinkTargetInside(root, target, entryName) {
  const rootReal = fs.realpathSync(root);
  let probe = target;
  while (!fs.existsSync(probe)) {
    const parent = path.dirname(probe);
    if (parent === probe) break;
    probe = parent;
  }
  const resolvedReal = fs.realpathSync(probe);
  const relative = path.relative(rootReal, resolvedReal);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`[desktop] Symlink target escapes the destination: ${entryName}`);
  }
}

function resolveSymlinkTargetInside(root, linkPath, linkTarget, entryName) {
  if (path.isAbsolute(linkTarget) || /^[A-Za-z]:/.test(linkTarget)) {
    throw new Error(`[desktop] Unsafe symlink target in Electron archive: ${entryName}`);
  }

  const rootReal = fs.realpathSync(root);
  let resolved = fs.realpathSync(path.dirname(linkPath));

  const assertInside = () => {
    const relative = path.relative(rootReal, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`[desktop] Symlink target escapes the destination: ${entryName}`);
    }
  };

  // Resolve existing components before applying `..`. Lexically collapsing the
  // target first lets an earlier directory symlink change what `..` means.
  for (const segment of linkTarget.replaceAll('\\', '/').split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      resolved = path.dirname(resolved);
      assertInside();
      continue;
    }

    const candidate = path.join(resolved, segment);
    try {
      resolved = fs.realpathSync(candidate);
    } catch (error) {
      if (!error || error.code !== 'ENOENT') throw error;
      try {
        if (fs.lstatSync(candidate).isSymbolicLink()) {
          throw new Error(`[desktop] Broken symlink target in Electron archive: ${entryName}`);
        }
      } catch (lstatError) {
        if (!lstatError || lstatError.code !== 'ENOENT') throw lstatError;
      }
      resolved = candidate;
    }
    assertInside();
  }

  return resolved;
}

module.exports = { assertSymlinkTargetInside, resolveSymlinkTargetInside, safeArchivePath };

const path = require('path');
const { fileURLToPath } = require('url');

function isExactFileUrl(fileUrl, expectedPath, platform = process.platform) {
  const windows = platform === 'win32';
  const pathImpl = windows ? path.win32 : path.posix;
  try {
    const parsed = new URL(fileUrl);
    if (parsed.protocol !== 'file:') return false;
    const actual = pathImpl.normalize(fileURLToPath(parsed, { windows }));
    const expected = pathImpl.normalize(expectedPath);
    return windows ? actual.toLowerCase() === expected.toLowerCase() : actual === expected;
  } catch {
    return false;
  }
}

module.exports = { isExactFileUrl };

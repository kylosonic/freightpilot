const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const DEFAULT_CONFIG = {
  opsConsoleUrl:
    process.env.OPS_CONSOLE_URL || 'https://freightpilot-ops.pages.dev/login',
  productSignupUrl:
    process.env.PRODUCT_SIGNUP_URL || 'https://freightpilot.pages.dev#signup',
  docsUrl: process.env.DOCS_URL || 'https://freightpilot.pages.dev',
  onboarding: {
    createdAccount: false,
    connectedConsole: false,
    invitedTeam: false,
    importedData: false,
    launchedLive: false,
    roleDispatcherReady: false,
    roleDataReady: false,
    roleSecurityReady: false,
    activeStep: 0,
  },
};

let setupWindow = null;
let consoleWindow = null;

/* ── Window state persistence ───────────────────────────────── */

function getWindowStatePath() {
  return path.join(app.getPath('userData'), 'freightpilot-window-state.json');
}

function loadWindowState(defaults) {
  try {
    const statePath = getWindowStatePath();
    if (fs.existsSync(statePath)) {
      const raw = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      return {
        x: typeof raw.x === 'number' ? raw.x : undefined,
        y: typeof raw.y === 'number' ? raw.y : undefined,
        width: typeof raw.width === 'number' && raw.width >= 800 ? raw.width : defaults.width,
        height: typeof raw.height === 'number' && raw.height >= 600 ? raw.height : defaults.height,
      };
    }
  } catch {
    // Ignore errors - use defaults
  }
  return defaults;
}

function saveWindowState(win) {
  if (!win || win.isDestroyed()) return;
  try {
    const bounds = win.getBounds();
    fs.writeFileSync(getWindowStatePath(), JSON.stringify(bounds, null, 2), 'utf8');
  } catch {
    // Ignore write errors
  }
}

/* ── Config management ──────────────────────────────────────── */

function getConfigPath() {
  return path.join(app.getPath('userData'), 'freightpilot-desktop-config.json');
}

function sanitizeUrl(value, fallback) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return fallback;
    }
    return parsed.toString();
  } catch {
    return fallback;
  }
}

function isLoopbackHostname(hostname) {
  return ['localhost', '127.0.0.1', '::1'].includes(hostname.toLowerCase());
}

function isPrivateIpv4(hostname) {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!match) return false;
  const [a, b] = match.slice(1).map(Number);
  return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function sanitizeExternalUrl(value) {
  try {
    const parsed = new URL(String(value));
    if (parsed.username || parsed.password) return '';
    if (parsed.protocol === 'https:') return parsed.toString();
    if (!app.isPackaged && parsed.protocol === 'http:' && isLoopbackHostname(parsed.hostname)) {
      return parsed.toString();
    }
  } catch {
    // Fall through to rejection.
  }
  return '';
}

function sanitizeConsoleUrl(value) {
  try {
    const parsed = new URL(String(value));
    if (parsed.username || parsed.password) return '';
    if (parsed.protocol !== 'https:' && !( !app.isPackaged && parsed.protocol === 'http:' && isLoopbackHostname(parsed.hostname))) {
      return '';
    }
    if (!isLoopbackHostname(parsed.hostname) && (isPrivateIpv4(parsed.hostname) || parsed.hostname === '0.0.0.0')) {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

function normalizeConfig(raw) {
  const merged = {
    ...DEFAULT_CONFIG,
    ...(raw || {}),
    onboarding: {
      ...DEFAULT_CONFIG.onboarding,
      ...((raw && raw.onboarding) || {}),
    },
  };

  return {
    ...merged,
    opsConsoleUrl: sanitizeUrl(merged.opsConsoleUrl, DEFAULT_CONFIG.opsConsoleUrl),
    productSignupUrl: sanitizeUrl(merged.productSignupUrl, DEFAULT_CONFIG.productSignupUrl),
    docsUrl: sanitizeUrl(merged.docsUrl, DEFAULT_CONFIG.docsUrl),
  };
}

function readConfig() {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return normalizeConfig(null);
  }

  try {
    const content = fs.readFileSync(configPath, 'utf8');
    return normalizeConfig(JSON.parse(content));
  } catch {
    return normalizeConfig(null);
  }
}

function writeConfig(partial) {
  const patch = partial && typeof partial === 'object' ? partial : {};
  const current = readConfig();
  const nextRaw = { ...current };
  for (const key of ['opsConsoleUrl', 'productSignupUrl', 'docsUrl']) {
    if (typeof patch[key] === 'string') nextRaw[key] = patch[key];
  }
  if (patch.onboarding && typeof patch.onboarding === 'object') {
    nextRaw.onboarding = { ...current.onboarding };
    for (const [key, value] of Object.entries(DEFAULT_CONFIG.onboarding)) {
      if (typeof value === 'boolean' && typeof patch.onboarding[key] === 'boolean') {
        nextRaw.onboarding[key] = patch.onboarding[key];
      }
    }
    if (Number.isInteger(patch.onboarding.activeStep)) {
      nextRaw.onboarding.activeStep = Math.max(0, Math.min(8, patch.onboarding.activeStep));
    }
  }
  const configPath = getConfigPath();
  const next = normalizeConfig(nextRaw);

  fs.writeFileSync(configPath, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

async function testConsoleReachability(url) {
  const target = sanitizeConsoleUrl(url);
  if (!target) {
    return {
      ok: false,
      status: 0,
      statusText: 'Blocked URL',
      url: '',
      message: 'Use an HTTPS console address. Local HTTP is allowed only in development.',
    };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(target, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url: target,
      message: response.ok
        ? 'Console endpoint is reachable.'
        : `Console returned ${response.status} ${response.statusText}`,
    };
  } catch (error) {
    clearTimeout(timeout);
    return {
      ok: false,
      status: 0,
      statusText: 'Connection error',
      url: target,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

function attachExternalLinkPolicy(win) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    const safe = sanitizeExternalUrl(url);
    if (safe) void shell.openExternal(safe).catch(() => {});
    return { action: 'deny' };
  });
}

function isAllowedNavigation(url, policy) {
  try {
    const parsed = new URL(url);
    if (policy.setup) {
      if (parsed.protocol !== 'file:') return false;
      const target = path.resolve(decodeURIComponent(parsed.pathname));
      const relative = path.relative(__dirname, target);
      return !relative.startsWith('..') && !path.isAbsolute(relative);
    }
    const target = new URL(policy.target);
    return parsed.origin === target.origin && (parsed.protocol === 'https:' || parsed.protocol === 'http:');
  } catch {
    return false;
  }
}

function attachNavigationPolicy(win, policy) {
  const blockUnexpected = (event, url) => {
    if (isAllowedNavigation(url, policy)) return;
    event.preventDefault();
    const safe = sanitizeExternalUrl(url);
    if (safe) void shell.openExternal(safe).catch(() => {});
  };

  win.webContents.on('will-navigate', blockUnexpected);
  win.webContents.on('will-redirect', blockUnexpected);
  win.webContents.on('will-attach-webview', (event) => event.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  win.webContents.session.setPermissionCheckHandler(() => false);
}

/* ── Application menu ───────────────────────────────────────── */

function buildAppMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Control Tower',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => {
            createConsoleWindow(readConfig().opsConsoleUrl);
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        ...(!app.isPackaged ? [{ role: 'toggleDevTools' }] : []),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        ...(isMac ? [{ role: 'zoom' }] : []),
        { type: 'separator' },
        {
          label: 'Show Setup Window',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            createSetupWindow();
          },
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Open Documentation',
          accelerator: 'F1',
          click: () => {
            const safe = sanitizeExternalUrl(readConfig().docsUrl);
            if (safe) void shell.openExternal(safe).catch(() => {});
          },
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

/* ── Window creation ────────────────────────────────────────── */

function createSetupWindow() {
  if (setupWindow && !setupWindow.isDestroyed()) {
    setupWindow.focus();
    return setupWindow;
  }

  const defaultBounds = { width: 1340, height: 900 };
  const restored = loadWindowState(defaultBounds);

  setupWindow = new BrowserWindow({
    ...restored,
    minWidth: 1080,
    minHeight: 760,
    autoHideMenuBar: false,
    title: 'FreightPilot Desktop Setup',
    backgroundColor: '#040c12',
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 16, y: 16 } } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  attachExternalLinkPolicy(setupWindow);
  attachNavigationPolicy(setupWindow, { setup: true });
  setupWindow.loadFile(path.join(__dirname, 'onboarding.html'));

  setupWindow.on('close', () => {
    saveWindowState(setupWindow);
  });

  setupWindow.on('closed', () => {
    setupWindow = null;
  });

  return setupWindow;
}

function createConsoleWindow(url) {
  const target = sanitizeUrl(url, readConfig().opsConsoleUrl);

  if (consoleWindow && !consoleWindow.isDestroyed()) {
    consoleWindow.loadURL(target);
    consoleWindow.focus();
    return consoleWindow;
  }

  consoleWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    autoHideMenuBar: false,
    title: 'FreightPilot Control Tower',
    backgroundColor: '#050b12',
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 16, y: 16 } } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  attachExternalLinkPolicy(consoleWindow);
  attachNavigationPolicy(consoleWindow, { target });
  consoleWindow.loadURL(target);
  consoleWindow.on('closed', () => {
    consoleWindow = null;
  });

  return consoleWindow;
}

/* ── IPC handlers ───────────────────────────────────────────── */

function assertTrustedIpcSender(event) {
  const senderUrl = event.senderFrame?.url || '';
  if (!isAllowedNavigation(senderUrl, { setup: true })) {
    throw new Error('Untrusted IPC sender');
  }
}

ipcMain.handle('desktop:get-config', async (event) => {
  assertTrustedIpcSender(event);
  return readConfig();
});
ipcMain.handle('desktop:save-config', async (event, partial) => {
  assertTrustedIpcSender(event);
  return writeConfig(partial);
});
ipcMain.handle('desktop:test-console', async (event, url) => {
  assertTrustedIpcSender(event);
  return testConsoleReachability(url);
});
ipcMain.handle('desktop:open-external', async (event, url) => {
  assertTrustedIpcSender(event);
  const safe = sanitizeExternalUrl(url);
  if (!safe) {
    return false;
  }
  await shell.openExternal(safe).catch(() => {});
  return true;
});
ipcMain.handle('desktop:launch-console', async (event, url) => {
  assertTrustedIpcSender(event);
  const safe = sanitizeConsoleUrl(url || readConfig().opsConsoleUrl);
  if (!safe) return false;
  createConsoleWindow(safe);
  return true;
});

/* ── App lifecycle ──────────────────────────────────────────── */

app.whenReady().then(() => {
  Menu.setApplicationMenu(buildAppMenu());
  createSetupWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSetupWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

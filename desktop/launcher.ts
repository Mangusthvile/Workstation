/**
 * Desktop launcher: the entry point of Workstation.exe.
 *
 * Double-clicking the exe:
 *   1. asks for a Gemini API key the first time (optional, only needed for AI editing),
 *   2. serves the built app from memory on http://localhost:3777,
 *   3. opens it in its own app window (Edge or Chrome, no browser toolbars),
 *   4. quits by itself once every Workstation window is closed.
 *
 * A second double-click while it is running just opens another window.
 * The fixed port matters: the browser keeps your saved work per address, so the
 * same address must be used every time for your data to be there.
 */
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline';
import type { Server } from 'http';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { createApp } from '../server/app';

export interface EmbeddedFile {
  type: string;
  base64: string;
}
export type EmbeddedFiles = Record<string, EmbeddedFile>;

const APP_NAME = 'Workstation';
const DEFAULT_PORT = 3777;
const PORT_ATTEMPTS = 10;
const TICK_MS = 30_000; // how often the launcher checks for open windows
const STALE_TICKS = 6; // a window that has not checked in for ~3 minutes is considered gone
const CLOSE_GRACE_MS = 6_000; // wait this long after the last window closes (a reload reconnects sooner)
const KEY_URL = 'https://aistudio.google.com/app/apikey';

const say = (...lines: string[]) => console.log(lines.map((l) => (l ? `  ${l}` : '')).join('\n'));

// ---------------------------------------------------------------------------
// Settings (Gemini key)
// ---------------------------------------------------------------------------

function dataDir(): string {
  if (process.env.WORKSTATION_DATA_DIR) return process.env.WORKSTATION_DATA_DIR;
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), APP_NAME);
  }
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', APP_NAME);
  return path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'workstation');
}

const settingsFile = () => path.join(dataDir(), 'settings.env');

function readApiKey(): string | undefined {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  try {
    return dotenv.parse(fs.readFileSync(settingsFile())).GEMINI_API_KEY || undefined;
  } catch {
    return undefined;
  }
}

function writeSettings(apiKey: string) {
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.writeFileSync(
    settingsFile(),
    [
      '# Workstation settings. You can edit this file with Notepad; changes apply right away.',
      `# Get a free Gemini API key at ${KEY_URL}`,
      `GEMINI_API_KEY=${apiKey}`,
      '',
    ].join('\r\n')
  );
}

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    })
  );
}

async function firstRunSetup(force: boolean) {
  if (process.env.GEMINI_API_KEY) return;
  if (!force && fs.existsSync(settingsFile())) return;
  if (!force && !process.stdin.isTTY) {
    writeSettings(''); // no console to ask in; leave an empty file the user can fill in
    return;
  }
  say(
    'First-time setup',
    '',
    'AI editing in the Text Editor uses Google Gemini. Paste your Gemini API key',
    `and press Enter (get one free at ${KEY_URL}),`,
    'or just press Enter to skip. Everything else works without a key.',
    ''
  );
  const key = (await ask('  Gemini API key: ')).replace(/^GEMINI_API_KEY=/, '').replace(/^["']|["']$/g, '');
  writeSettings(key);
  say('', key ? 'Key saved.' : 'Skipped.', `You can change it any time in: ${settingsFile()}`, '');
}

// ---------------------------------------------------------------------------
// App window
// ---------------------------------------------------------------------------

function findOnPath(names: string[]): string | undefined {
  const dirs = (process.env.PATH || '').split(path.delimiter);
  for (const name of names) for (const dir of dirs) if (dir && fs.existsSync(path.join(dir, name))) return path.join(dir, name);
  return undefined;
}

/** An installed Chromium-based browser that supports app windows (--app). */
function findAppBrowser(): string | undefined {
  if (process.env.WORKSTATION_BROWSER) return process.env.WORKSTATION_BROWSER;
  if (process.platform === 'win32') {
    const roots = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA].filter(Boolean) as string[];
    const apps = [
      ['Microsoft', 'Edge', 'Application', 'msedge.exe'],
      ['Google', 'Chrome', 'Application', 'chrome.exe'],
      ['BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'],
    ];
    for (const parts of apps) for (const root of roots) {
      const candidate = path.join(root, ...parts);
      if (fs.existsSync(candidate)) return candidate;
    }
    return undefined;
  }
  if (process.platform === 'darwin') {
    return [
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ].find((p) => fs.existsSync(p));
  }
  return findOnPath(['google-chrome', 'chromium', 'chromium-browser', 'microsoft-edge']);
}

function openDefaultBrowser(url: string) {
  const [cmd, args] =
    process.platform === 'win32'
      ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
      : process.platform === 'darwin'
      ? ['open', [url]]
      : ['xdg-open', [url]];
  try {
    spawn(cmd, args as string[], { detached: true, stdio: 'ignore' }).on('error', () => {}).unref();
  } catch {
    /* the console message tells the user the address */
  }
}

function openAppWindow(url: string) {
  const browser = findAppBrowser();
  if (!browser) {
    openDefaultBrowser(url);
    return;
  }
  // A dedicated profile keeps Workstation's saved data separate from normal browsing,
  // so clearing your browser history never wipes your work.
  const profile = path.join(dataDir(), 'window-profile');
  const child = spawn(
    browser,
    [`--app=${url}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--start-maximized'],
    { detached: true, stdio: 'ignore' }
  );
  child.on('error', () => openDefaultBrowser(url));
  child.unref();
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

async function isWorkstationRunning(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1500) });
    const body = (await res.json()) as { app?: string };
    return body?.app === 'workstation';
  } catch {
    return false;
  }
}

function listen(app: express.Express, port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1');
    server.once('listening', () => resolve(server));
    server.once('error', reject);
  });
}

function decodeFiles(files: EmbeddedFiles) {
  const map = new Map<string, { type: string; body: Buffer }>();
  for (const [file, { type, base64 }] of Object.entries(files)) map.set(file, { type, body: Buffer.from(base64, 'base64') });
  const index = map.get('/index.html');
  if (!index) throw new Error('The app build is missing index.html');
  // Tells the page it is running as the desktop app (it then reports when windows close).
  index.body = Buffer.from(
    index.body.toString('utf8').replace('<head>', '<head>\n    <meta name="workstation-desktop" content="1" />')
  );
  return map;
}

export async function runDesktop(files: EmbeddedFiles) {
  process.title = APP_NAME;
  say('', 'Workstation', '');

  await firstRunSetup(process.argv.includes('--setup'));

  const assets = decodeFiles(files);
  const startPort = Number(process.env.WORKSTATION_PORT) || DEFAULT_PORT;
  let port = startPort;
  const allowedHosts = () => new Set([`localhost:${port}`, `127.0.0.1:${port}`]);

  const app = express();
  app.disable('x-powered-by');

  // Only answer requests addressed to this machine (blocks DNS-rebinding tricks from websites).
  app.use((req, res, next) => {
    if (!allowedHosts().has(String(req.headers.host))) return void res.status(403).end();
    next();
  });

  // --- Window tracking: quit once every Workstation window is closed ---------
  const windows = new Map<string, number>(); // window id -> tick it last checked in
  let tick = 0;
  let everConnected = false;
  let server: Server | undefined;

  let quitting = false;
  const quit = (reason: string) => {
    if (quitting) return;
    quitting = true;
    say(reason, 'Goodbye.');
    server?.close();
    setTimeout(() => process.exit(0), 300);
  };

  const sameOrigin = (req: express.Request) => {
    const origin = req.headers.origin;
    return !origin || origin === `http://localhost:${port}` || origin === `http://127.0.0.1:${port}`;
  };

  app.post('/api/desktop/ping', (req, res) => {
    const id = String(req.query.id || '');
    if (!id || !sameOrigin(req)) return void res.status(400).end();
    windows.set(id, tick);
    everConnected = true;
    res.status(204).end();
  });

  app.post('/api/desktop/bye', (req, res) => {
    if (!sameOrigin(req)) return void res.status(403).end();
    windows.delete(String(req.query.id || ''));
    res.status(204).end();
    setTimeout(() => {
      if (everConnected && windows.size === 0) quit('Workstation window closed.');
    }, CLOSE_GRACE_MS);
  });

  setInterval(() => {
    tick++;
    for (const [id, seen] of windows) if (tick - seen > STALE_TICKS) windows.delete(id);
    if (everConnected && windows.size === 0) quit('No Workstation windows are open.');
  }, TICK_MS);

  // --- The shared Workstation API (/api/edit, /api/health) -------------------
  app.use(
    createApp({
      getApiKey: readApiKey,
      missingKeyMessage: `No Gemini API key is set. Open ${settingsFile()} in Notepad, put your key after GEMINI_API_KEY= and save, then try again.`,
    })
  );

  // --- Static app from memory -----------------------------------------------
  app.use((req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api/')) return next();
    const asset = assets.get(req.path) ?? assets.get('/index.html')!;
    res.setHeader('Content-Type', asset.type);
    res.setHeader('Cache-Control', req.path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
    res.end(asset.body);
  });

  // --- Start, or hand off to an instance that is already running -------------
  for (let attempt = 0; attempt < PORT_ATTEMPTS; attempt++, port++) {
    if (await isWorkstationRunning(port)) {
      const url = `http://localhost:${port}`;
      say('Workstation is already running. Opening another window...');
      openAppWindow(url);
      setTimeout(() => process.exit(0), 1500);
      return;
    }
    try {
      server = await listen(app, port);
      break;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw err;
    }
  }
  if (!server) throw new Error(`Ports ${startPort}-${startPort + PORT_ATTEMPTS - 1} are all in use by other programs.`);

  const url = `http://localhost:${port}`;
  if (port !== startPort) {
    say(`Note: port ${startPort} is taken by another program, so this session uses ${port}.`, 'Work saved under the usual address will not show here; export a backup to move it.', '');
  }
  say(
    `Running at ${url}`,
    readApiKey() ? 'AI editing: ready' : `AI editing: off (no Gemini key). Add one in ${settingsFile()}`,
    '',
    'Keep this window open while you use Workstation.',
    'It closes by itself when you close the Workstation window.',
    ''
  );
  openAppWindow(url);

  setTimeout(() => {
    if (!everConnected) say(`If no window appeared, open ${url} in your web browser.`);
  }, 45_000);
}

/** Entry helper: keeps the console open on fatal errors so the message can be read. */
export function startDesktop(files: EmbeddedFiles) {
  runDesktop(files).catch(async (err) => {
    console.error(`\n  Workstation could not start: ${(err as Error)?.message ?? err}\n`);
    if (process.stdin.isTTY) await ask('  Press Enter to close.');
    process.exit(1);
  });
}

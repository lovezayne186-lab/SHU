import { createServer } from 'node:http';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';

const root = process.cwd();
const entry = process.env.CODEX_ENTRY || 'index.html';
const host = '127.0.0.1';
const httpPort = Number(process.env.CODEX_HTTP_PORT || '18787');
const devtoolsPort = Number(process.env.CODEX_DEVTOOLS_PORT || '19222');
const pageUrl = `http://${host}:${httpPort}/${entry}`;

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function getMimeType(filePath) {
  return mimeTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream';
}

function withinRoot(filePath) {
  const normalizedRoot = path.resolve(root);
  const normalizedTarget = path.resolve(filePath);
  return normalizedTarget.startsWith(normalizedRoot);
}

async function createStaticServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${host}:${httpPort}`);
      const pathname = decodeURIComponent(url.pathname === '/' ? `/${entry}` : url.pathname);
      const filePath = path.join(root, pathname);

      if (!withinRoot(filePath)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      await access(filePath);
      const data = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(httpPort, host, resolve);
  });

  return server;
}

async function waitForDevtools(timeoutMs = 15000) {
  const startedAt = Date.now();
  const versionUrl = `http://${host}:${devtoolsPort}/json/version`;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(versionUrl);
      if (res.ok) {
        return;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for DevTools at ${versionUrl}`);
}

async function openTarget() {
  const targetUrl = `http://${host}:${devtoolsPort}/json/new?${encodeURIComponent(pageUrl)}`;
  let res = await fetch(targetUrl, { method: 'PUT' });
  if (!res.ok) {
    res = await fetch(targetUrl);
  }
  if (!res.ok) {
    throw new Error(`Failed to create DevTools target: ${res.status}`);
  }
  return res.json();
}

function launchEdge() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = path.join(process.env.TEMP, `codex-edge-profile-${Date.now()}`);
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${devtoolsPort}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ];

  const child = spawn(edgePath, args, { stdio: 'ignore' });
  child.userDataDir = userDataDir;
  return child;
}

async function sendCdp(ws, id, method, params = {}) {
  ws.send(JSON.stringify({ id, method, params }));
}

async function main() {
  const server = await createStaticServer();
  const edge = launchEdge();

  const cleanup = async () => {
    server.close();
    if (!edge.killed) {
      edge.kill('SIGKILL');
    }
  };

  try {
    await waitForDevtools();
    const target = await openTarget();
    const ws = new WebSocket(target.webSocketDebuggerUrl);

    const consoleEvents = [];
    const exceptions = [];
    const logEntries = [];
    const networkFailures = [];

    let loadSeenAt = 0;

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => resolve(), 20000);

      ws.addEventListener('open', async () => {
        try {
          await sendCdp(ws, 1, 'Runtime.enable');
          await sendCdp(ws, 2, 'Log.enable');
          await sendCdp(ws, 3, 'Network.enable');
          await sendCdp(ws, 4, 'Page.enable');
        } catch (error) {
          reject(error);
        }
      });

      ws.addEventListener('message', (event) => {
        const message = JSON.parse(event.data.toString());
        if (!message.method) {
          return;
        }

        switch (message.method) {
          case 'Runtime.consoleAPICalled': {
            const parts = (message.params.args || []).map((arg) => {
              if ('value' in arg) return String(arg.value);
              if ('description' in arg) return String(arg.description);
              if ('unserializableValue' in arg) return String(arg.unserializableValue);
              return '<unavailable>';
            });
            consoleEvents.push({
              type: message.params.type,
              text: parts.join(' '),
            });
            break;
          }
          case 'Runtime.exceptionThrown': {
            const details = message.params.exceptionDetails || {};
            exceptions.push({
              text: details.text || '',
              url: details.url || '',
              line: details.lineNumber ?? null,
              column: details.columnNumber ?? null,
              description: details.exception?.description || '',
            });
            break;
          }
          case 'Log.entryAdded': {
            const entryData = message.params.entry || {};
            logEntries.push({
              level: entryData.level || '',
              text: entryData.text || '',
              url: entryData.url || '',
              line: entryData.lineNumber ?? null,
            });
            break;
          }
          case 'Network.loadingFailed': {
            networkFailures.push({
              errorText: message.params.errorText || '',
              blockedReason: message.params.blockedReason || '',
              canceled: Boolean(message.params.canceled),
            });
            break;
          }
          case 'Page.loadEventFired': {
            if (!loadSeenAt) {
              loadSeenAt = Date.now();
            }
            break;
          }
          default:
            break;
        }

        if (loadSeenAt && Date.now() - loadSeenAt > 2500) {
          clearTimeout(timeout);
          resolve();
        }
      });

      ws.addEventListener('error', reject);
      ws.addEventListener('close', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    console.log(
      JSON.stringify(
        {
          pageUrl,
          console: consoleEvents,
          exceptions,
          logs: logEntries,
          networkFailures,
        },
        null,
        2,
      ),
    );
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

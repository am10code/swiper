import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_PORT = 4173;
const DEFAULT_MOCK_PATH = '/Users/am10/Downloads/mock.swiper';
const root = path.resolve(new URL('..', import.meta.url).pathname);

function getArgValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

const port = Number(getArgValue('--port', DEFAULT_PORT)) || DEFAULT_PORT;
const mockPath = getArgValue('--mock', DEFAULT_MOCK_PATH);

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.mp3', 'audio/mpeg'],
  ['.wav', 'audio/wav']
]);

function resolveRequestPath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '') || 'main.html';
  const fullPath = path.resolve(root, cleanPath);
  return fullPath.startsWith(root) ? fullPath : null;
}

async function readMockData() {
  const raw = await readFile(mockPath, 'utf8');
  const parsed = JSON.parse(raw);
  const tasks = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.tasks) ? parsed.tasks : []);
  return {
    tasks,
    categories: ['Работа', 'Личное', 'Покупки'],
    settings: {
      defaultCategory: '',
      showCompleted: true,
      taskDisplayMode: 'all',
      taskCreationMode: 'bottom',
      activeFlowTimeWindowMin: 30,
      dailyCapacityMin: 240,
      logCompletedSteps: false,
      globalPomodoroSettings: {
        interval: 25,
        shortBreak: 5,
        longBreak: 15,
        longBreakAfter: 4
      }
    }
  };
}

async function createChromeStub() {
  const data = await readMockData();
  return `<script>
    window.__SWIPER_AUDIT_DATA__ = ${JSON.stringify(data)};
    window.__uiErrors = [];
    window.addEventListener('error', (event) => {
      window.__uiErrors.push(String(event.message || event.error || 'unknown error'));
    });
    window.addEventListener('unhandledrejection', (event) => {
      window.__uiErrors.push(String(event.reason?.message || event.reason || 'unhandled rejection'));
    });
    window.chrome = window.chrome || {};
    window.chrome.runtime = window.chrome.runtime || {
      getURL(path) {
        return '/' + String(path || '').replace(/^\\/+/, '');
      }
    };
    window.chrome.storage = {
      local: {
        get(keys, callback) {
          const source = window.__SWIPER_AUDIT_DATA__;
          let result = {};
          if (keys === null || keys === undefined) {
            result = { ...source };
          } else if (Array.isArray(keys)) {
            keys.forEach((key) => { result[key] = source[key]; });
          } else if (typeof keys === 'string') {
            result[keys] = source[keys];
          } else if (typeof keys === 'object') {
            result = { ...keys };
            Object.keys(keys).forEach((key) => {
              if (Object.prototype.hasOwnProperty.call(source, key)) result[key] = source[key];
            });
          }
          callback(result);
        },
        set(updates, callback) {
          Object.assign(window.__SWIPER_AUDIT_DATA__, updates || {});
          if (callback) callback();
        },
        remove(keys, callback) {
          const list = Array.isArray(keys) ? keys : [keys];
          list.forEach((key) => delete window.__SWIPER_AUDIT_DATA__[key]);
          if (callback) callback();
        },
        clear(callback) {
          Object.keys(window.__SWIPER_AUDIT_DATA__).forEach((key) => delete window.__SWIPER_AUDIT_DATA__[key]);
          if (callback) callback();
        }
      }
    };
  </script>`;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    const fullPath = resolveRequestPath(url.pathname);
    if (!fullPath) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const ext = path.extname(fullPath);
    let body = await readFile(fullPath);
    if (ext === '.html') {
      const stub = await createChromeStub();
      body = Buffer.from(String(body).replace('</head>', `${stub}</head>`));
    }

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', mimeTypes.get(ext) || 'application/octet-stream');
    res.writeHead(200);
    res.end(body);
  } catch (error) {
    res.writeHead(error?.code === 'ENOENT' ? 404 : 500);
    res.end(error?.message || 'Server error');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Swiper UI audit server: http://127.0.0.1:${port}/main.html#tasks`);
  console.log(`Mock data: ${mockPath}`);
});

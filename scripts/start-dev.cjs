const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const postgresRoot = process.env.POSTGRES_ROOT || 'C:\\Program Files\\PostgreSQL\\18';
const postgresBin = path.join(postgresRoot, 'bin');
const dataDirectory =
  process.env.POSTGRES_DATA_DIRECTORY || path.join(postgresRoot, 'data');
const logFile = path.join(dataDirectory, 'log', 'dev-startup.log');
const isWindows = process.platform === 'win32';
const pgIsReady = isWindows
  ? path.join(postgresBin, 'pg_isready.exe')
  : 'pg_isready';
const pgCtl = isWindows ? path.join(postgresBin, 'pg_ctl.exe') : 'pg_ctl';

function run(command, args) {
  return spawnSync(command, args, {
    stdio: 'ignore',
    windowsHide: true,
  });
}

function ensureDatabaseIsRunning() {
  if (run(pgIsReady, ['-h', 'localhost', '-p', '5432']).status === 0) {
    console.log('[dev] PostgreSQL is already running.');
    return;
  }

  if (isWindows && !fs.existsSync(pgCtl)) {
    throw new Error(
      `PostgreSQL was not found at ${postgresRoot}. Set POSTGRES_ROOT to its installation directory.`
    );
  }

  if (!fs.existsSync(dataDirectory)) {
    throw new Error(
      `PostgreSQL data directory was not found at ${dataDirectory}.`
    );
  }

  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const result = run(pgCtl, ['start', '-D', dataDirectory, '-l', logFile, '-w']);
  if (result.status !== 0 || run(pgIsReady, ['-h', 'localhost', '-p', '5432']).status !== 0) {
    throw new Error(`PostgreSQL could not be started. Check ${logFile}.`);
  }

  console.log('[dev] PostgreSQL started.');
}

function isPortInUse(port) {
  return new Promise(resolve => {
    const socket = net.createConnection({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      socket.destroy();
      const ipv6Socket = net.createConnection({ port, host: '::1' });
      ipv6Socket.once('connect', () => {
        ipv6Socket.destroy();
        resolve(true);
      });
      ipv6Socket.once('error', () => {
        ipv6Socket.destroy();
        resolve(false);
      });
    });
  });
}

const serviceUrls = {
  api: 'http://127.0.0.1:3000/api/v1/health',
  driver: 'http://127.0.0.1:3002/',
  web: 'http://127.0.0.1:3004/',
};

async function waitForService(service, timeoutMs = 60_000) {
  const startedAt = Date.now();
  const url = serviceUrls[service.name];

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.ok) return;
    } catch {
      // The service may still be compiling or waiting for its dependency.
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error(
    `${service.name} did not become ready within ${timeoutMs / 1000}s. ` +
      `Check the ${service.name} terminal for startup errors.`
  );
}

function openDevPage() {
  if (process.env.OPEN_DEV_PAGE === 'false') return;
  setTimeout(() => {
    const browserCommand = isWindows
      ? [process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'start "" "http://localhost:3004"']]
      : ['xdg-open', ['http://localhost:3004']];
    spawn(browserCommand[0], browserCommand[1], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    }).unref();
  }, 3000);
}

async function startDevelopmentServices() {
  ensureDatabaseIsRunning();

  const services = [
    { name: 'api', packageName: '@bus-tracking/api', port: 3000 },
    { name: 'driver', packageName: '@bus-tracking/driver', port: 3002 },
    { name: 'web', packageName: '@bus-tracking/web', port: 3004 },
  ];
  const pendingServices = [];

  for (const service of services) {
    if (await isPortInUse(service.port)) {
      console.log(`[dev] ${service.name} is already running on port ${service.port}; waiting for readiness.`);
      await waitForService(service);
      console.log(`[dev] ${service.name} is ready.`);
    } else {
      pendingServices.push(service);
    }
  }

  if (pendingServices.length === 0) {
    openDevPage();
    return;
  }

  const processes = pendingServices.map(service => {
    const command = isWindows ? process.env.ComSpec || 'cmd.exe' : 'pnpm';
    const args = isWindows
      ? ['/d', '/s', '/c', `pnpm --filter ${service.packageName} dev`]
      : ['--filter', service.packageName, 'dev'];
    console.log(`[dev] Starting ${service.name} on port ${service.port}...`);
    return spawn(command, args, {
      stdio: 'inherit',
      windowsHide: false,
    });
  });

  const stopDevProcesses = () => {
    for (const child of processes) {
      if (!child.killed) child.kill();
    }
  };

  process.on('SIGINT', stopDevProcesses);
  process.on('SIGTERM', stopDevProcesses);

  await Promise.all(
    pendingServices.map(async service => {
      await waitForService(service);
      console.log(`[dev] ${service.name} is ready.`);
    })
  );

  openDevPage();

  await Promise.all(
    processes.map(
      child =>
        new Promise((resolve, reject) => {
          child.once('error', reject);
          child.once('exit', (code, signal) => {
            if (code && code !== 0) reject(new Error(`Development service exited with code ${code}`));
            else resolve();
          });
        }),
    ),
  );
}

startDevelopmentServices().catch(error => {
  console.error(`[dev] ${error.message}`);
  process.exitCode = 1;
});

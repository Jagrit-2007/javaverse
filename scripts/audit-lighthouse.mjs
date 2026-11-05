import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const webDir = path.join(rootDir, 'apps', 'web');
const lhciDir = path.join(webDir, '.lighthouseci');

// Pinned LHCI container image and immutable digest
export const LHCI_IMAGE =
  'patrickhulce/lhci-client:0.15.1@sha256:558210c5e422a7babaaa09c285b7469da3f00fac1a9880c37883c65d666a7fc9';

console.log('--- Starting Containerized Lighthouse CI Audit ---');
console.log(`Pinned Image: ${LHCI_IMAGE}`);

// Clean/prepare .lighthouseci directory
if (fs.existsSync(lhciDir)) {
  fs.rmSync(lhciDir, { recursive: true, force: true });
}
fs.mkdirSync(lhciDir, { recursive: true });

const uid = process.getuid ? process.getuid() : 1000;
const gid = process.getgid ? process.getgid() : 1000;

// 1. Start production server
console.log('1. Starting Next.js production server on http://127.0.0.1:3000 ...');
const serverProc = spawn('pnpm', ['--filter', '@javaverse/web', 'start'], {
  cwd: rootDir,
  env: {
    ...process.env,
    PORT: '3000',
    E2E_FIXTURES_ENABLED: 'true',
  },
  stdio: 'inherit',
});

// Helper to kill server process
const cleanupServer = () => {
  if (serverProc && !serverProc.killed) {
    console.log('Cleaning up production server process...');
    serverProc.kill('SIGTERM');
  }
};

process.on('SIGINT', () => {
  cleanupServer();
  process.exit(1);
});
process.on('SIGTERM', () => {
  cleanupServer();
  process.exit(1);
});

// Poll for server health
const waitForServer = async (maxAttempts = 40) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch('http://127.0.0.1:3000/api/v1/health');
      if (res.ok) {
        console.log('Server is healthy and ready for auditing.');
        return;
      }
    } catch {
      // wait 500ms
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Timed out waiting for Next.js server to start.');
};

try {
  await waitForServer();

  // 2. Run LHCI collect via pinned container
  console.log('2. Running Lighthouse collect (3 runs, mobile preset) via pinned container...');
  execSync(
    `docker run --rm --network host --user ${uid}:${gid} -v "${webDir}:/work" -w /work ${LHCI_IMAGE} lhci collect --config=lighthouserc.json --startServerCommand=""`,
    { stdio: 'inherit' },
  );

  // 3. Run LHCI assert via pinned container
  console.log('3. Running Lighthouse assert against Phase 2 performance/a11y/bp/seo budgets...');
  execSync(
    `docker run --rm --user ${uid}:${gid} -v "${webDir}:/work" -w /work ${LHCI_IMAGE} lhci assert --config=lighthouserc.json`,
    { stdio: 'inherit' },
  );

  console.log('--- Lighthouse CI Audit Successfully Passed! ---');
} finally {
  cleanupServer();
}

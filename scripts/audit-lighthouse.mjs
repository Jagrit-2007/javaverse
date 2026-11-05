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

// 1. Start production server with process group separation for clean teardown
console.log('1. Starting Next.js production server on http://127.0.0.1:3000 ...');
const serverProc = spawn('pnpm', ['--filter', '@javaverse/web', 'start'], {
  cwd: rootDir,
  env: {
    ...process.env,
    PORT: '3000',
    E2E_FIXTURES_ENABLED: 'true',
  },
  stdio: 'inherit',
  detached: true,
});

// Helper to kill server process group
const cleanupServer = () => {
  if (serverProc && !serverProc.killed) {
    console.log('Cleaning up production server process group...');
    try {
      if (serverProc.pid) {
        process.kill(-serverProc.pid, 'SIGTERM');
      }
    } catch {
      try {
        serverProc.kill('SIGTERM');
      } catch {}
    }
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

// Safe container execution wrapper providing isolated writable HOME/XDG dirs for Chrome
const runLhciInContainer = (args, networkHost = false) => {
  const networkArg = networkHost ? '--network host' : '';
  const safeShellCmd =
    'mkdir -p "$HOME/.config" "$HOME/.cache" && test -w "$HOME" && test -w "$HOME/.config" && test -w "$HOME/.cache" && exec lhci "$@"';
  const dockerCmd = `docker run --rm ${networkArg} --user ${uid}:${gid} --env HOME=/tmp/lhci-home --env XDG_CONFIG_HOME=/tmp/lhci-home/.config --env XDG_CACHE_HOME=/tmp/lhci-home/.cache --shm-size=1g -v "${webDir}:/work" -w /work ${LHCI_IMAGE} sh -c '${safeShellCmd}' -- ${args}`;
  execSync(dockerCmd, { stdio: 'inherit' });
};

try {
  await waitForServer();

  // 2. Run LHCI collect via pinned container
  console.log('2. Running Lighthouse collect (3 runs, mobile preset) via pinned container...');
  runLhciInContainer('collect --config=lighthouserc.json --startServerCommand=""', true);

  // Inspect LHR json files to verify requestedUrl and finalUrl
  const lhrFiles = fs
    .readdirSync(lhciDir)
    .filter((f) => f.startsWith('lhr-') && f.endsWith('.json'))
    .sort();
  console.log('Lighthouse Runs Summary:');
  for (const f of lhrFiles) {
    const lhr = JSON.parse(fs.readFileSync(path.join(lhciDir, f), 'utf8'));
    console.log(
      `  - requestedUrl: ${lhr.requestedUrl} | finalUrl: ${lhr.finalUrl} | scores: perf=${lhr.categories.performance?.score}, a11y=${lhr.categories.accessibility?.score}, bp=${lhr.categories['best-practices']?.score}, seo=${lhr.categories.seo?.score}`,
    );
  }

  // 3. Run LHCI assert via pinned container
  console.log('3. Running Lighthouse assert against Phase 2 performance/a11y/bp/seo budgets...');
  runLhciInContainer('assert --config=lighthouserc.json', false);

  console.log('--- Lighthouse CI Audit Successfully Passed! ---');
} finally {
  cleanupServer();
}

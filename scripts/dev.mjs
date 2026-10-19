// ---------------------------------------------------------------------------
// scripts/dev.mjs — runs the Convention Hall API (server/) and the FRCC_MAIN
// Vite dev server together. Brought over with the Convention Hall module.
//
//   npm run dev:all        → API on http://localhost:5000 + app on http://localhost:5173
//   npm run server         → API only
//   npm run dev            → app only (hall API calls will fail without server)
// ---------------------------------------------------------------------------
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

console.log('🚀 Starting FRCC Convention Hall API + FRCC_MAIN app...\n');

const backend = spawn(process.execPath, [path.join(rootDir, 'server', 'index.js')], {
  cwd: rootDir,
  stdio: 'inherit',
});

const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: isWin,
});

function cleanup() {
  console.log('\n🛑 Shutting down...');
  if (backend && !backend.killed) {
    if (isWin) spawn('taskkill', ['/pid', backend.pid, '/f', '/t']);
    else backend.kill();
  }
  if (frontend && !frontend.killed) {
    if (isWin) spawn('taskkill', ['/pid', frontend.pid, '/f', '/t']);
    else frontend.kill();
  }
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

// Sanitize and enforce standard NODE_ENV for Next.js production builds
if (process.env.NODE_ENV) {
  process.env.NODE_ENV = process.env.NODE_ENV.replace(/['"\s]/g, '');
}

// In Next.js, next build MUST strictly run under production
process.env.NODE_ENV = 'production';

const { spawnSync } = require('child_process');
const isWin = process.platform === 'win32';
const nextCmd = isWin ? 'next.cmd' : 'next';

const result = spawnSync(nextCmd, ['build'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 0);

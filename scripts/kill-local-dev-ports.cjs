#!/usr/bin/env node
/**
 * Frees Spectra local dev ports so VS Code / debugger launches don't hit EADDRINUSE.
 * Align with README port map (APIs, Angular serve, Expo web).
 */
const { execSync } = require('child_process');

/** HTTP ports used by nx serve for this repo's stack (not Postgres 5432). */
const PORTS = [
  3000, 3001, 3002, 3003, 3004, 3005, 3006, 9100,
  4200, 4201, 4202,
  8081,
];

function killListeners(port) {
  if (process.platform === 'win32') {
    try {
      execSync(
        `powershell -NoProfile -Command "$p = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -Expand OwningProcess -Unique; if ($p) { $p | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }"`,
        { stdio: 'ignore' }
      );
    } catch (_) {
      /* ignore */
    }
    return;
  }

  try {
    execSync(`fuser -k ${port}/tcp 2>/dev/null`, { stdio: 'ignore' });
  } catch (_) {
    /* fuser missing or nothing listening */
  }

  try {
    const out = execSync(
      `lsof -ti :${port} -sTCP:LISTEN 2>/dev/null || true`,
      { encoding: 'utf8' }
    ).trim();
    if (!out) return;
    const pids = [...new Set(out.split(/\s+/).filter(Boolean))];
    for (const pid of pids) {
      try {
        process.kill(Number(pid), 'SIGTERM');
      } catch (_) {
        /* ignore */
      }
    }
  } catch (_) {
    /* ignore */
  }
}

for (const port of PORTS) {
  killListeners(port);
}

#!/usr/bin/env node
/**
 * Angular 21's @angular/build loads @angular/compiler-cli via require(); compiler-cli
 * is ESM-only. Node needs --experimental-require-module for that path (Node 20.18+).
 * This wrapper appends the flag once so `npm run nx -- …` works without hand-set NODE_OPTIONS.
 */
const { spawnSync } = require('child_process');

const flag = '--experimental-require-module';
const prev = process.env.NODE_OPTIONS ?? '';
if (!prev.includes(flag)) {
  process.env.NODE_OPTIONS = `${prev} ${flag}`.trim();
}

const nxMain = require.resolve('nx/bin/nx');
const result = spawnSync(process.execPath, [nxMain, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(result.status ?? 1);

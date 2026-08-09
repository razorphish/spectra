/**
 * After `nx run auth:build`, writes `packages/auth/dist/scope-map.json` from compiled scope-map.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const modPath = path.join(root, 'dist/packages/auth/src/lib/scope-map.js');
if (!fs.existsSync(modPath)) {
  console.error('[emit-scope-map-json] Run `nx run auth:build` first. Missing:', modPath);
  process.exit(1);
}
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mod = require(modPath);
const outDir = path.join(root, 'packages/auth/dist');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'scope-map.json');
fs.writeFileSync(outFile, JSON.stringify(mod.exportScopeMapForContract(), null, 2));
console.log('[emit-scope-map-json] wrote', outFile);

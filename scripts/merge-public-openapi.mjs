#!/usr/bin/env node
/**
 * Merges per-service OpenAPI YAML into:
 * - spectra-integration-api.json — full merged contract (GET /integration/openapi.json)
 * - spectra-public-api.json — public limited (GET /openapi.json + public /docs)
 *
 * ## x-spectra-audience (vendor extension)
 * Each path item MUST set `x-spectra-audience` at the path level (sibling of get/post/…):
 * - `public` — included in public limited unless a prefix safety denylist still excludes it
 * - `integration` — full catalog only (excluded from public limited)
 * - `internal` — full catalog only (staff/BFF-adjacent; excluded from public limited)
 *
 * Merge-time rules for public limited:
 * 1. Paths matching PUBLIC_LIMITED_PREFIX_DENYLIST are always excluded (safety net).
 * 2. Else if audience is `integration` or `internal`, exclude.
 * 3. Else include (covers `public` and any future extension values validated at parse time).
 *
 * After filtering, asserts no denylisted path keys remain in the public artifact.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

/** @type {readonly string[]} */
const PUBLIC_LIMITED_PREFIX_DENYLIST = [
  '/v1/platform/sandbox',
  '/v1/platform/uploads',
  '/v1/platform/health',
  '/v1/platform/stats',
];

const SPECTRA_AUDIENCE = new Set(['public', 'integration', 'internal']);

const SERVICES = [
  { name: 'aviate-api', path: 'apps/services/aviate-api/open-api/openapi.yaml' },
  { name: 'seq-api', path: 'apps/services/seq-api/open-api/openapi.yaml' },
  { name: 'quantum-api', path: 'apps/services/quantum-api/open-api/openapi.yaml' },
  { name: 'corridor-api', path: 'apps/services/corridor-api/open-api/openapi.yaml' },
];

function loadYaml(relPath) {
  const full = join(root, relPath);
  if (!existsSync(full)) {
    throw new Error(`Missing OpenAPI file: ${full}`);
  }
  return yaml.parse(readFileSync(full, 'utf8'));
}

function mergeComponents(target, source) {
  if (!source?.components) return;
  target.components ??= {};
  if (source.components.securitySchemes) {
    target.components.securitySchemes ??= {};
    Object.assign(target.components.securitySchemes, source.components.securitySchemes);
  }
  if (source.components.schemas) {
    target.components.schemas ??= {};
    Object.assign(target.components.schemas, source.components.schemas);
  }
}

/**
 * @param {string} pathKey
 * @param {Record<string, unknown>} pathItem
 * @returns {string}
 */
function getPathAudience(pathKey, pathItem) {
  const raw = pathItem['x-spectra-audience'];
  if (raw === undefined || raw === null) {
    throw new Error(
      `[openapi:merge] Missing x-spectra-audience on path "${pathKey}". ` +
        `Allowed: ${[...SPECTRA_AUDIENCE].join(', ')}.`
    );
  }
  if (typeof raw !== 'string' || !SPECTRA_AUDIENCE.has(raw)) {
    throw new Error(
      `[openapi:merge] Invalid x-spectra-audience "${String(raw)}" on path "${pathKey}". ` +
        `Allowed: ${[...SPECTRA_AUDIENCE].join(', ')}.`
    );
  }
  return raw;
}

/**
 * @param {string} pathKey
 * @returns {boolean}
 */
function pathMatchesPublicDenylist(pathKey) {
  return PUBLIC_LIMITED_PREFIX_DENYLIST.some(
    (prefix) => pathKey === prefix || pathKey.startsWith(`${prefix}/`)
  );
}

/**
 * @param {string} pathKey
 * @param {Record<string, unknown>} pathItem
 */
function includeInPublicLimited(pathKey, pathItem) {
  if (pathMatchesPublicDenylist(pathKey)) return false;
  const aud = getPathAudience(pathKey, pathItem);
  if (aud === 'integration' || aud === 'internal') return false;
  return true;
}

/**
 * @param {Record<string, unknown>} spec
 */
function assertPublicLimitedNoDenylistedPaths(spec) {
  const paths = spec.paths;
  if (!paths || typeof paths !== 'object') return;
  for (const pathKey of Object.keys(paths)) {
    if (pathMatchesPublicDenylist(pathKey)) {
      throw new Error(
        `[openapi:merge] Public limited artifact still contains denylisted path: ${pathKey}`
      );
    }
  }
}

const merged = {
  openapi: '3.0.3',
  info: {
    title: 'Spectra API',
    version: '0.0.1',
    description:
      'Unified contract for platform, seq, quantum, and corridor segments. ' +
      'Local dev base URL: http://127.0.0.1:3000 (local-edge). ' +
      'Public `GET /openapi.json` serves a filtered catalog; full paths: `GET /integration/openapi.json`.',
  },
  servers: [
    { url: 'http://127.0.0.1:3000', description: 'Local unified edge (local-edge)' },
    { url: 'https://api.example.spectra.inc', description: 'Deployed public gateway (placeholder)' },
  ],
  paths: {},
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Auth0 access token for the public/sandbox API audience (SANDBOX_UI_AUTH0_AUDIENCE).',
      },
    },
    schemas: {},
  },
};

for (const svc of SERVICES) {
  const doc = loadYaml(svc.path);
  if (doc.paths) {
    Object.assign(merged.paths, doc.paths);
  }
  mergeComponents(merged, doc);
}

for (const pathKey of Object.keys(merged.paths)) {
  getPathAudience(pathKey, /** @type {Record<string, unknown>} */ (merged.paths[pathKey]));
}

const full = /** @type {typeof merged} */ (JSON.parse(JSON.stringify(merged)));
full.info = {
  ...full.info,
  title: 'Spectra API (full catalog)',
};

const publicLimited = /** @type {typeof merged} */ (JSON.parse(JSON.stringify(merged)));
publicLimited.info = {
  ...publicLimited.info,
  title: 'Spectra Public API (limited)',
};

for (const pathKey of Object.keys(publicLimited.paths)) {
  const item = /** @type {Record<string, unknown>} */ (publicLimited.paths[pathKey]);
  if (!includeInPublicLimited(pathKey, item)) {
    delete publicLimited.paths[pathKey];
  }
}

assertPublicLimitedNoDenylistedPaths(publicLimited);

/** Every path in the public limited artifact must be explicitly `public` (defense in depth after audience filter). */
function assertPublicLimitedAudiencePublicOnly(spec) {
  const paths = spec.paths;
  if (!paths || typeof paths !== 'object') return;
  for (const pathKey of Object.keys(paths)) {
    const item = /** @type {Record<string, unknown>} */ (paths[pathKey]);
    const aud = getPathAudience(pathKey, item);
    if (aud !== 'public') {
      throw new Error(
        `[openapi:merge] Public limited path "${pathKey}" has x-spectra-audience "${aud}"; only "public" is allowed in the customer catalog.`
      );
    }
  }
}

assertPublicLimitedAudiencePublicOnly(publicLimited);

const outDir = join(root, 'packages/openapi/dist');
mkdirSync(outDir, { recursive: true });
const integrationOut = join(outDir, 'spectra-integration-api.json');
const publicOut = join(outDir, 'spectra-public-api.json');
writeFileSync(integrationOut, JSON.stringify(full, null, 2));
writeFileSync(publicOut, JSON.stringify(publicLimited, null, 2));

const assetDir = join(root, 'apps/services/aviate-api/src/assets');
mkdirSync(assetDir, { recursive: true });
writeFileSync(join(assetDir, 'spectra-integration-api.json'), JSON.stringify(full, null, 2));
writeFileSync(join(assetDir, 'spectra-public-api.json'), JSON.stringify(publicLimited, null, 2));

console.log(`[openapi:merge] wrote ${integrationOut}`);
console.log(`[openapi:merge] wrote ${publicOut}`);

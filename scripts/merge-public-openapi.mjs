#!/usr/bin/env node
/**
 * Merges per-service OpenAPI specs into spectra-public-api.json for Swagger UI.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

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

const merged = {
  openapi: '3.0.3',
  info: {
    title: 'Spectra Public API',
    version: '0.0.1',
    description:
      'Unified contract for platform, seq, quantum, and corridor segments. ' +
      'Local dev base URL: http://127.0.0.1:3000 (local-edge).',
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

const outDir = join(root, 'packages/openapi/dist');
mkdirSync(outDir, { recursive: true });
const outJson = join(outDir, 'spectra-public-api.json');
writeFileSync(outJson, JSON.stringify(merged, null, 2));

const assetDir = join(root, 'apps/services/aviate-api/src/assets');
mkdirSync(assetDir, { recursive: true });
writeFileSync(join(assetDir, 'spectra-public-api.json'), JSON.stringify(merged, null, 2));

console.log(`[openapi:merge] wrote ${outJson}`);

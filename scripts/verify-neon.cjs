#!/usr/bin/env node
/**
 * Quick check that a Neon URL (e.g. NEON_DATABASE_URL or legacy DATABASE_URL) works.
 * For remote testing set `SPECTRA_DB_TARGET=neon` and put the pooled string in NEON_DATABASE_URL.
 * Usage: from repo root, `node scripts/verify-neon.cjs` (loads `.env` via dotenv if present)
 */
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const url =
  process.env['DATABASE_URL'] ?? process.env['NEON_DATABASE_URL'] ?? '';
if (!url) {
  console.error('Set DATABASE_URL or NEON_DATABASE_URL in .env (see .env.example).');
  process.exit(1);
}

const sql = neon(url);
sql`select 1 as ok`
  .then((rows) => {
    console.log('Neon connection OK', rows);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Neon connection failed:', err?.message ?? err);
    process.exit(1);
  });

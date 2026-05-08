#!/usr/bin/env node
/**
 * Prevents concurrent `npm install` in this repo (WSL_ENOTEMPTY / corrupted node_modules).
 * Wired from package.json preinstall/postinstall.
 *
 * Stale lock: if no npm is running, run: rm -f .npm-install.running
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const lockFile = path.join(root, ".npm-install.running");

const cmd = process.argv[2];
if (cmd === "lock") {
  try {
    fs.writeFileSync(lockFile, `${process.pid}\n`, { flag: "wx" });
  } catch (e) {
    if (e && e.code === "EEXIST") {
      let msg = "";
      try {
        msg = fs.readFileSync(lockFile, "utf8").trim();
      } catch {
        /* ignore */
      }
      console.error(
        "[spectra] Another `npm install` is already running in this directory (lock: .npm-install.running" +
          (msg ? `, pid ${msg}` : "") +
          ").\n" +
          "  Stop the other terminal, Cursor agent, or CI job. If it crashed, run: rm -f .npm-install.running"
      );
      process.exit(1);
    }
    throw e;
  }
} else if (cmd === "unlock") {
  try {
    fs.unlinkSync(lockFile);
  } catch {
    /* ignore */
  }
} else {
  console.error("Usage: node scripts/npm-one-at-a-time.cjs lock|unlock");
  process.exit(2);
}

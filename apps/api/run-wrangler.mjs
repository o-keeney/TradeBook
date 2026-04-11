#!/usr/bin/env node
/**
 * Spawn Wrangler via the current Node binary so we never rely on npm's Windows shim
 * ("Could not determine Node.js install directory").
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let wranglerBin;
try {
  wranglerBin = require.resolve("wrangler/bin/wrangler.js");
} catch {
  console.error(
    "Could not resolve wrangler. From the repo root run: npm install",
  );
  process.exit(1);
}

const cwd = fileURLToPath(new URL(".", import.meta.url));
const args = process.argv.slice(2);
const r = spawnSync(process.execPath, [wranglerBin, ...args], {
  stdio: "inherit",
  cwd,
  env: process.env,
  shell: false,
});
process.exit(r.status === null ? 1 : r.status);

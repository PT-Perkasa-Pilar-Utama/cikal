#!/usr/bin/env node
// Menghapus folder modul tambahan di luar manifest client dari salinan source build image, sebelum tsc, sehingga kode,
// migrasi, menu, dan seed modul tak berlisensi tidak ikut ke image (technical-specs 02 §2.4 PK-02, LC-05). Hanya
// dijalankan di tahap build Dockerfile; checkout repo tidak pernah dipangkas.
// Pemakaian: node prune.mjs --manifest <path> --src <apps/api/src>
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { manifest: { type: "string" }, src: { type: "string" } } });
if (!values.manifest || !values.src) {
  console.error("Usage: prune.mjs --manifest <path> --src <apps/api/src>");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const registry = JSON.parse(readFileSync(join(here, "module-registry.json"), "utf8"));
const manifest = JSON.parse(readFileSync(resolve(values.manifest), "utf8"));
const addonsDir = join(resolve(values.src), "modules", "addons");

// `./modules/addons/m07-dukcapil/index.js` -> `m07-dukcapil`
const kept = new Set(
  manifest.modules
    .flatMap((code) => registry[code] ?? [])
    .map((entry) => entry.importPath.split(posix.sep))
    .filter((parts) => parts[2] === "addons")
    .map((parts) => parts[3]),
);

const removed = [];
for (const folder of existsSync(addonsDir) ? readdirSync(addonsDir) : []) {
  if (kept.has(folder)) continue;
  rmSync(join(addonsDir, folder), { recursive: true, force: true });
  removed.push(folder);
}
console.log(`Pruned ${removed.length} unlicensed module(s)${removed.length ? `: ${removed.join(", ")}` : ""}`);

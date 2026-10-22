#!/usr/bin/env node
// Membangkitkan migrasi SQL satu modul dari db/schema.ts-nya (technical-specs 06 §6.12 MS-01).
// Pemakaian (dari apps/api): pnpm db:generate <modul|platform> [nama-migrasi]
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const [moduleName, migrationName] = process.argv.slice(2);
if (!moduleName) {
  console.error("Usage: pnpm db:generate <module> [migration-name]");
  process.exit(2);
}

const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..");
// `platform` adalah skema infrastruktur bersama di src/platform (technical-specs 05 §5.0).
const candidates =
  moduleName === "platform"
    ? [join(apiDir, "src", "platform")]
    : ["core", "addons"].map((group) => join(apiDir, "src", "modules", group, moduleName));
const moduleDir = candidates.find((dir) => existsSync(join(dir, "db", "schema.ts")));
if (!moduleDir) {
  console.error(`Module ${moduleName} has no db/schema.ts under src/platform, src/modules/core, or src/modules/addons`);
  process.exit(1);
}

const out = join(moduleDir, "db", "migrations");
// drizzle-kit membaca --schema sebagai glob, jadi path relatif memakai garis miring maju di Windows juga.
const posix = (path) => relative(apiDir, path).split(sep).join("/");
const args = [
  "drizzle-kit",
  "generate",
  "--dialect=postgresql",
  `--schema=${posix(join(moduleDir, "db", "schema.ts"))}`,
  `--out=${posix(out)}`,
  ...(migrationName ? [`--name=${migrationName}`] : []),
];
execFileSync("pnpm", ["exec", ...args], { cwd: apiDir, stdio: "inherit", shell: process.platform === "win32" });

// Migrator membuat skema ledger lebih dulu (MS-04), jadi CREATE SCHEMA dari drizzle-kit harus idempoten.
for (const file of readdirSync(out).filter((name) => name.endsWith(".sql"))) {
  const path = join(out, file);
  const sql = readFileSync(path, "utf8");
  const fixed = sql.replace(/CREATE SCHEMA "([^"]+)";/g, 'CREATE SCHEMA IF NOT EXISTS "$1";');
  if (fixed !== sql) writeFileSync(path, fixed);
}

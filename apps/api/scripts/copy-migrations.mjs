#!/usr/bin/env node
// tsc tidak menyalin file SQL; salin folder db/migrations setiap modul ke dist agar runner menemukannya
// relatif terhadap modulnya di image (technical-specs 06 §6.12 MS-02).
import { cpSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..");
let copied = 0;
for (const group of ["core", "addons"]) {
  const groupDir = join(apiDir, "src", "modules", group);
  for (const name of readdirSync(groupDir)) {
    const from = join(groupDir, name, "db", "migrations");
    if (!existsSync(join(from, "meta", "_journal.json"))) continue;
    cpSync(from, join(apiDir, "dist", "modules", group, name, "db", "migrations"), { recursive: true });
    copied++;
  }
}
console.log(`Copied migrations of ${copied} module(s) to dist`);

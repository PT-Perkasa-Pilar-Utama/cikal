#!/usr/bin/env node
// tsc tidak menyalin file SQL; salin folder db/migrations platform dan setiap modul ke dist agar runner menemukannya
// relatif terhadap modulnya di image (technical-specs 06 §6.12 MS-02).
import { cpSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const folders = [join("platform", "db", "migrations")];
for (const group of ["core", "addons"]) {
  for (const name of readdirSync(join(apiDir, "src", "modules", group))) {
    folders.push(join("modules", group, name, "db", "migrations"));
  }
}
let copied = 0;
for (const folder of folders) {
  const from = join(apiDir, "src", folder);
  if (!existsSync(join(from, "meta", "_journal.json"))) continue;
  cpSync(from, join(apiDir, "dist", folder), { recursive: true });
  copied++;
}
console.log(`Copied migrations of ${copied} module(s) to dist`);

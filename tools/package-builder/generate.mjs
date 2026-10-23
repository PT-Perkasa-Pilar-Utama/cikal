#!/usr/bin/env node
// Membangkitkan apps/api/src/licensed-modules.generated.ts dari manifest client (technical-specs 02 §2.4), dan
// licensed-module-codes.generated.ts di folder yang sama. Kode lisensi dipisah agar modul (contoh guard identity)
// bisa membacanya tanpa mengimpor semua modul, yang membuat impor melingkar. license-public-key.generated.ts memuat
// kunci publik Ed25519 yang dipercaya image (technical-specs 07 §7.6); kunci dipilih saat build, bukan lewat env,
// sehingga instalasi tidak bisa menukarnya.
// Pemakaian: node generate.mjs --manifest <path> --license-key <public-key.pem> --out <path>
import { createPublicKey } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: { manifest: { type: "string" }, "license-key": { type: "string" }, out: { type: "string" } },
});
if (!values.manifest || !values["license-key"] || !values.out) {
  console.error("Usage: generate.mjs --manifest <path> --license-key <public-key.pem> --out <path>");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const registry = JSON.parse(readFileSync(join(here, "module-registry.json"), "utf8"));
const manifest = JSON.parse(readFileSync(resolve(values.manifest), "utf8"));

if (!Array.isArray(manifest.modules) || !manifest.modules.includes("CORE")) {
  console.error(`Manifest ${values.manifest} must list modules and include CORE`);
  process.exit(1);
}

const entries = [];
for (const code of manifest.modules) {
  const modules = registry[code];
  if (!modules) {
    console.error(`Module ${code} in manifest is not in module-registry.json`);
    process.exit(1);
  }
  entries.push(...modules);
}

// `IdentityModule` -> `identityData`: kontrak migrasi dan seed yang diekspor index.ts modul (technical-specs 06 §6.12).
const dataName = (className) => className.charAt(0).toLowerCase() + className.slice(1).replace(/Module$/, "Data");

const header = `// Dibangkitkan oleh tools/package-builder dari ${values.manifest.replaceAll("\\", "/")}. Jangan diubah manual.`;
const codesOut = join(dirname(resolve(values.out)), "licensed-module-codes.generated.ts");
const codeLines = [header, "", `export const licensedModuleCodes = ${JSON.stringify(manifest.modules)} as const;`, ""];
writeFileSync(codesOut, codeLines.join("\n"));

const licenseKeyPem = readFileSync(resolve(values["license-key"]), "utf8");
if (createPublicKey(licenseKeyPem).asymmetricKeyType !== "ed25519") {
  console.error(`License key ${values["license-key"]} must be an Ed25519 public key`);
  process.exit(1);
}
const licenseKeyHeader = `// Dibangkitkan oleh tools/package-builder dari ${values["license-key"].replaceAll("\\", "/")}. Jangan diubah manual.`;
const keyOut = join(dirname(resolve(values.out)), "license-public-key.generated.ts");
writeFileSync(
  keyOut,
  [licenseKeyHeader, "", `export const licensePublicKeyPem = ${JSON.stringify(licenseKeyPem)};`, ""].join("\n"),
);

const lines = [
  header,
  `import type { ModuleData } from "./platform/migrate/module-data.js";`,
  ...entries.map((e) => `import { ${e.className}, ${dataName(e.className)} } from "${e.importPath}";`),
  "",
  `export const licensedModules = [${entries.map((e) => e.className).join(", ")}];`,
  "",
  "/** Urutan dependensi dari module-registry.json: CORE dasar lebih dulu, modul tambahan terakhir (MS-04). */",
  `export const licensedModuleData: readonly ModuleData[] = [${entries.map((e) => dataName(e.className)).join(", ")}];`,
  "",
];
writeFileSync(resolve(values.out), lines.join("\n"));
console.log(`Generated ${values.out} with ${entries.length} modules for client ${manifest.client}`);

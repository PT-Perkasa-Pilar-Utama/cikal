#!/usr/bin/env node
// Membangkitkan apps/api/src/licensed-modules.generated.ts dari manifest client (technical-specs 02 §2.4).
// Pemakaian: node generate.mjs --manifest <path> --out <path>
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: { manifest: { type: "string" }, out: { type: "string" } },
});
if (!values.manifest || !values.out) {
  console.error("Usage: generate.mjs --manifest <path> --out <path>");
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

const lines = [
  `// Dibangkitkan oleh tools/package-builder dari ${values.manifest.replaceAll("\\", "/")}. Jangan diubah manual.`,
  `import type { ModuleData } from "./platform/migrate/module-data.js";`,
  ...entries.map((e) => `import { ${e.className}, ${dataName(e.className)} } from "${e.importPath}";`),
  "",
  `export const licensedModuleCodes = ${JSON.stringify(manifest.modules)} as const;`,
  "",
  `export const licensedModules = [${entries.map((e) => e.className).join(", ")}];`,
  "",
  "/** Urutan dependensi dari module-registry.json: CORE dasar lebih dulu, modul tambahan terakhir (MS-04). */",
  `export const licensedModuleData: readonly ModuleData[] = [${entries.map((e) => dataName(e.className)).join(", ")}];`,
  "",
];
writeFileSync(resolve(values.out), lines.join("\n"));
console.log(`Generated ${values.out} with ${entries.length} modules for client ${manifest.client}`);

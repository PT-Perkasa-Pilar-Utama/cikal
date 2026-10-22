import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), "../src");
const modulesDir = join(srcDir, "modules");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith(".ts") ? [path] : [];
  });
}

/** `modules/<group>/<module>` pemilik sebuah file, atau null bila di luar modul. */
function owningModule(path: string): string | null {
  const rel = relative(modulesDir, path);
  if (rel.startsWith("..")) return null;
  const [group, name] = rel.split(sep);
  return group && name ? `${group}/${name}` : null;
}

const importPattern = /from\s+["'](\.{1,2}\/[^"']+)["']/g;
const files = walk(srcDir).filter((f) => !f.endsWith(".generated.ts"));

describe("architecture rules (technical-specs 03 §3.3)", () => {
  it("imports another module only through its index.ts (RP-02, XM-01)", () => {
    const violations: string[] = [];
    for (const file of files) {
      const from = owningModule(file);
      for (const match of readFileSync(file, "utf8").matchAll(importPattern)) {
        const target = resolve(dirname(file), match[1] ?? "").replace(/\.js$/, ".ts");
        const to = owningModule(target);
        if (to && to !== from && relative(join(modulesDir, to), target) !== "index.ts") {
          violations.push(`${relative(srcDir, file)} -> ${match[1]}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("declares an access rule on every route handler (technical-specs 07 §7.2)", () => {
    const violations: string[] = [];
    for (const file of files.filter((f) => f.endsWith(".controller.ts"))) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, index) => {
        if (!/^\s*@(Get|Post|Put|Patch|Delete)\(/.test(line)) return;
        let start = index;
        let end = index;
        while (start > 0 && lines[start - 1]?.trim().startsWith("@")) start--;
        while (end < lines.length - 1 && lines[end + 1]?.trim().startsWith("@")) end++;
        const block = lines.slice(start, end + 1).join("\n");
        if (!/@(Requires|Public|Authenticated)\(/.test(block)) {
          violations.push(`${relative(srcDir, file)}:${index + 1}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });
});

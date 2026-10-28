import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repoDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const GENERATOR = join(repoDir, "tools/package-builder/generate.mjs");
const PRUNER = join(repoDir, "tools/package-builder/prune.mjs");
const DEV_KEY = join(repoDir, "deploy/license/dev-license-public-key.pem");

/** Perakitan paket per manifest client (technical-specs 02 §2.4 PK-01, PK-02) seperti dijalankan build image. */
describe("package builder", () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "cikal-package-"));
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const manifestOf = (modules: string[]): string => {
    const manifest = join(dir, "manifest.json");
    writeFileSync(manifest, JSON.stringify({ client: "uji", modules }));
    return manifest;
  };
  const build = (modules: string[]): { modules: string; codes: string } => {
    const manifest = manifestOf(modules);
    const out = join(dir, "licensed-modules.generated.ts");
    execFileSync(process.execPath, [GENERATOR, "--manifest", manifest, "--license-key", DEV_KEY, "--out", out], {
      stdio: "pipe",
    });
    return {
      modules: readFileSync(out, "utf8"),
      codes: readFileSync(join(dir, "licensed-module-codes.generated.ts"), "utf8"),
    };
  };

  it("AC-100.03 packages only the modules of the client manifest", () => {
    const generated = build(["CORE", "M07"]);

    expect(generated.codes).toContain('export const licensedModuleCodes = ["CORE","M07"] as const;');
    expect(generated.modules).toContain('from "./modules/addons/m07-dukcapil/index.js"');
    expect(generated.modules).toContain('from "./modules/core/tenancy/index.js"');
    expect(generated.modules).not.toContain("m06-dedup");
    expect(generated.modules).not.toContain("m08-fraud");
    expect(generated.modules).not.toContain("m15-disbursement");
  });

  it("AC-100.03 removes the source of modules outside the manifest before the image is compiled", () => {
    const src = join(dir, "src");
    for (const folder of ["m06-dedup", "m07-dukcapil", "m12-sikp"]) {
      mkdirSync(join(src, "modules", "addons", folder, "db", "migrations"), { recursive: true });
    }
    mkdirSync(join(src, "modules", "core", "tenancy"), { recursive: true });

    execFileSync(process.execPath, [PRUNER, "--manifest", manifestOf(["CORE", "M07"]), "--src", src], {
      stdio: "pipe",
    });

    const addon = (folder: string) => existsSync(join(src, "modules", "addons", folder));
    expect([addon("m06-dedup"), addon("m07-dukcapil"), addon("m12-sikp")]).toEqual([false, true, false]);
    expect(existsSync(join(src, "modules", "core", "tenancy"))).toBe(true);
  });

  it("refuses a manifest without CORE", () => {
    expect(() => build(["M07"])).toThrow(/must list modules and include CORE/);
  });
});

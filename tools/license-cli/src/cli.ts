#!/usr/bin/env node
// CLI penerbit dan pemeriksa file lisensi bertanda tangan untuk tim PPU (US-100, technical-specs 07 §7.6).
// Kunci privat tidak pernah di-commit; simpan di password manager tim dan hapus salinan lokal setelah dipakai.
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { deploymentTypeSchema, moduleCodeSchema } from "@cikal/contracts";
import { ZodError, z } from "zod";
import { writeLicenseKeyFiles, writeNewFile } from "./key-files.js";
import { checkLicense, issueLicense } from "./license.js";

const USAGE = `Usage:
  cikal-license keygen --out <dir>
  cikal-license issue --key <private-key.pem> --number <license-number> --company <code> --deployment <SAAS|ON_PREMISE>
                      --modules <CORE,M06,...> --valid-from <YYYY-MM-DD> --valid-to <YYYY-MM-DD> [--max-users <n>] --out <file>
  cikal-license verify --public-key <public-key.pem> --file <license.json>`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: "string" },
    key: { type: "string" },
    number: { type: "string" },
    company: { type: "string" },
    deployment: { type: "string" },
    modules: { type: "string" },
    "valid-from": { type: "string" },
    "valid-to": { type: "string" },
    "max-users": { type: "string" },
    "public-key": { type: "string" },
    file: { type: "string" },
  },
});

function required(name: keyof typeof values): string {
  const value = values[name];
  if (typeof value !== "string" || value.length === 0) fail(`Missing --${name}`, 2);
  return value;
}

function fail(message: string, code = 1): never {
  console.error(`${message}\n\n${USAGE}`);
  process.exit(code);
}

function writeNew(path: string, content: string): void {
  writeNewFile(path, content);
  console.log(`wrote ${path}`);
}

function keygen(): void {
  const paths = writeLicenseKeyFiles(required("out"));
  console.log(`wrote ${paths.signingKey}`);
  console.log(`wrote ${paths.publicKey}`);
}

function issue(): void {
  const maxUsers = values["max-users"];
  const file = issueLicense(
    {
      licenseNumber: required("number"),
      companyCode: required("company"),
      deploymentType: deploymentTypeSchema.parse(required("deployment")),
      modules: required("modules")
        .split(",")
        .map((code) => moduleCodeSchema.parse(code.trim())),
      validFrom: required("valid-from"),
      validTo: required("valid-to"),
      maxUsers: maxUsers === undefined ? null : Number(maxUsers),
    },
    readFileSync(required("key"), "utf8"),
  );
  writeNew(required("out"), `${JSON.stringify(file, null, 2)}\n`);
}

function verify(): void {
  const raw: unknown = JSON.parse(readFileSync(required("file"), "utf8"));
  const license = checkLicense(raw, readFileSync(required("public-key"), "utf8"));
  if (!license) fail("License file is invalid");
  console.log(`License ${license.licenseNumber} is valid for company ${license.companyCode} until ${license.validTo}`);
}

const commands: Record<string, () => void> = { keygen, issue, verify };
const command = commands[positionals[0] ?? ""];
if (!command) fail("Unknown command", 2);
try {
  command();
} catch (error) {
  if (error instanceof ZodError) fail(z.prettifyError(error));
  throw error;
}

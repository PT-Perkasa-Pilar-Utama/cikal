#!/usr/bin/env node
// Membuat file secret acak untuk compose dev di deploy/compose/.secrets (diabaikan git). Tidak menimpa file yang ada.
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "..", "deploy", "compose", ".secrets");
mkdirSync(dir, { recursive: true });

const secrets = {
  s3_access_key: () => `cikal${randomBytes(6).toString("hex")}`,
  s3_secret_key: () => randomBytes(24).toString("hex"),
  monitoring_token: () => randomBytes(24).toString("hex"),
  reset_token: () => randomBytes(24).toString("hex"),
};

for (const [name, make] of Object.entries(secrets)) {
  const path = join(dir, name);
  if (existsSync(path)) {
    console.log(`kept    ${name}`);
    continue;
  }
  writeFileSync(path, make(), { mode: 0o600 });
  console.log(`created ${name}`);
}

// Identitas S3 SeaweedFS dibentuk dari pasangan kunci di atas.
const read = (name) => readFileSync(join(dir, name), "utf8").trim();
const s3Config = {
  identities: [
    {
      name: "cikal",
      credentials: [{ accessKey: read("s3_access_key"), secretKey: read("s3_secret_key") }],
      actions: ["Admin", "Read", "Write", "List", "Tagging"],
    },
  ],
};
writeFileSync(join(dir, "s3.json"), JSON.stringify(s3Config, null, 2), { mode: 0o600 });
console.log("wrote   s3.json");

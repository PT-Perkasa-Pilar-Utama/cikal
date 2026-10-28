import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import pg from "pg";
import { readLicenseFile } from "../../modules/core/tenancy/index.js";
import { loadConfig } from "../config/config.js";
import { readMasterKey } from "../config/master-key.js";
import { createS3Client, emptyBucket, putObject } from "../storage/storage.module.js";
import { createAdmin } from "./create-admin.js";
import { installedModuleData } from "./installed-modules.js";
import { licenseFileInstaller } from "./license-file.js";
import type { SeedContext, SeedName } from "./module-data.js";
import { appRoleFor, migrateModules, resetState, seedModules } from "./runner.js";

/**
 * Perintah tetap migrasi dan seed (technical-specs 06 §6.12 MS-05):
 *   node dist/platform/migrate/run.js migrate
 *   node dist/platform/migrate/run.js seed --seed=base|dev|qa
 *   node dist/platform/migrate/run.js reset --seed=dev|qa      (ditolak di production)
 *   node dist/platform/migrate/run.js create-admin --username <u> --email <e> [--full-name <n>]
 *        [--company-name <n> --address <a>]                     (company dari LICENSE_FILE, DEPLOYMENT_PLAN §3.6)
 *   node dist/platform/migrate/run.js install-license          (LICENSE_FILE untuk company seed SIT/UAT)
 * Connection string dari `DATABASE_MIGRATION_URL`; role aplikasi untuk grant dari `DATABASE_URL`.
 * Password akun seed `dev` dan `qa` dibaca dari file `SEED_USER_PASSWORD_FILE` (DEPLOYMENT_PLAN §6.5).
 */
if (!process.env.APP_ENV && existsSync(".env")) {
  process.loadEnvFile(".env");
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    seed: { type: "string" },
    username: { type: "string" },
    email: { type: "string" },
    "full-name": { type: "string", default: "Administrator" },
    "company-name": { type: "string" },
    address: { type: "string" },
  },
});
const command = positionals[0];

function fail(message: string, code = 1): never {
  console.error(message);
  process.exit(code);
}

function seedArg<T extends SeedName>(allowed: readonly T[]): T {
  const seed = allowed.find((name) => name === values.seed);
  if (!seed) fail(`--seed must be one of: ${allowed.join(", ")}`, 2);
  return seed;
}

const migrationUrl = process.env.DATABASE_MIGRATION_URL;
if (!migrationUrl) fail("DATABASE_MIGRATION_URL is required");
const appRole = appRoleFor(process.env.DATABASE_URL, migrationUrl);
const pool = new pg.Pool({ connectionString: migrationUrl, max: 2 });
const passwordFile = process.env.SEED_USER_PASSWORD_FILE;

/** Klien storage dibuat saat seed pertama menulis objek, sehingga `migrate` dan seed `base` tidak butuh konfigurasi S3. */
function seedStorage(): SeedContext["putObject"] {
  let target: { client: ReturnType<typeof createS3Client>; bucket: string } | null = null;
  return (object) => {
    if (!target) {
      const { storage } = loadConfig();
      target = { client: createS3Client(storage), bucket: storage.bucket };
    }
    return putObject(target.client, target.bucket, object);
  };
}

const seedContext = {
  userPassword: passwordFile ? readFileSync(passwordFile, "utf8").trim() : null,
  putObject: seedStorage(),
};

try {
  switch (command) {
    case "migrate": {
      const applied = await migrateModules(pool, installedModuleData, appRole);
      console.log(`Applied ${applied} migration(s) across ${installedModuleData.length} schemas`);
      break;
    }
    case "seed": {
      const seed = seedArg(["base", "dev", "qa"]);
      await seedModules(pool, installedModuleData, seed, {
        ...seedContext,
        masterKey: readMasterKey(process.env.MASTER_KEY_FILE),
      });
      console.log(`Seed ${seed} applied`);
      break;
    }
    case "reset": {
      const seed = seedArg(["dev", "qa"]);
      const config = loadConfig();
      if (config.appEnv === "production") fail("Reset is not allowed in production");
      const s3 = createS3Client(config.storage);
      const result = await resetState({
        appEnv: config.appEnv,
        pool,
        modules: installedModuleData,
        appRole,
        seed,
        seedContext: {
          ...seedContext,
          masterKey: config.masterKey,
          putObject: (object) => putObject(s3, config.storage.bucket, object),
        },
        emptyBucket: () => emptyBucket(s3, config.storage.bucket),
        installLicense: licenseFileInstaller(pool, config.licenseFile, config.licensePublicKey),
      });
      console.log(JSON.stringify(result));
      break;
    }
    case "install-license": {
      const config = loadConfig();
      if (!config.licenseFile) fail("LICENSE_FILE is required for install-license");
      const installLicense = licenseFileInstaller(pool, config.licenseFile, config.licensePublicKey);
      await installLicense?.();
      console.log(`License ${config.licenseFile} installed`);
      break;
    }
    case "create-admin": {
      const config = loadConfig();
      if (!config.licenseFile) fail("LICENSE_FILE is required for create-admin");
      if (!values.username || !values.email) fail("create-admin requires --username and --email", 2);
      const admin = await createAdmin(pool, {
        license: readLicenseFile(config.licenseFile, config.licensePublicKey),
        masterKey: config.masterKey,
        username: values.username,
        fullName: values["full-name"],
        email: values.email,
        companyName: values["company-name"] ?? null,
        address: values.address ?? null,
      });
      // Password sekali pakai hanya tampil di terminal operator; simpan di vault, wajib diganti saat login pertama.
      console.log(`Company ${admin.companyCode}: license ${admin.licenseInstalled ? "installed" : "already active"}`);
      console.log(`Admin ${admin.username} one-time password: ${admin.oneTimePassword}`);
      break;
    }
    default:
      fail(
        "Usage: run.js migrate | seed --seed=base|dev|qa | reset --seed=dev|qa | install-license | create-admin --username <u> --email <e>",
        2,
      );
  }
} finally {
  await pool.end();
}

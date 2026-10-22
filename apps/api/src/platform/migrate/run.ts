import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import pg from "pg";
import { licensedModuleData } from "../../licensed-modules.generated.js";
import { loadConfig } from "../config/config.js";
import { createS3Client, emptyBucket } from "../storage/storage.module.js";
import type { SeedName } from "./module-data.js";
import { appRoleFor, migrateModules, resetState, seedModules } from "./runner.js";

/**
 * Perintah tetap migrasi dan seed (technical-specs 06 §6.12 MS-05):
 *   node dist/platform/migrate/run.js migrate
 *   node dist/platform/migrate/run.js seed --seed=base|dev|qa
 *   node dist/platform/migrate/run.js reset --seed=dev|qa      (ditolak di production)
 * Connection string dari `DATABASE_MIGRATION_URL`; role aplikasi untuk grant dari `DATABASE_URL`.
 */
if (!process.env.APP_ENV && existsSync(".env")) {
  process.loadEnvFile(".env");
}

const { positionals, values } = parseArgs({ allowPositionals: true, options: { seed: { type: "string" } } });
const command = positionals[0];

function fail(message: string, code = 1): never {
  console.error(message);
  process.exit(code);
}

function seedArg<T extends SeedName>(allowed: readonly T[]): T {
  const seed = values.seed as T | undefined;
  if (!seed || !allowed.includes(seed)) fail(`--seed must be one of: ${allowed.join(", ")}`, 2);
  return seed;
}

const migrationUrl = process.env.DATABASE_MIGRATION_URL;
if (!migrationUrl) fail("DATABASE_MIGRATION_URL is required");
const appRole = appRoleFor(process.env.DATABASE_URL, migrationUrl);
const pool = new pg.Pool({ connectionString: migrationUrl, max: 2 });

try {
  switch (command) {
    case "migrate": {
      const applied = await migrateModules(pool, licensedModuleData, appRole);
      console.log(`Applied ${applied} migration(s) across ${licensedModuleData.length} licensed modules`);
      break;
    }
    case "seed": {
      const seed = seedArg(["base", "dev", "qa"]);
      await seedModules(pool, licensedModuleData, seed);
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
        modules: licensedModuleData,
        appRole,
        seed,
        emptyBucket: () => emptyBucket(s3, config.storage.bucket),
      });
      console.log(JSON.stringify(result));
      break;
    }
    default:
      fail("Usage: run.js migrate | seed --seed=base|dev|qa | reset --seed=dev|qa", 2);
  }
} finally {
  await pool.end();
}

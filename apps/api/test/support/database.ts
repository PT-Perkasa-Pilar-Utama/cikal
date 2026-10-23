import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import pg from "pg";
import type { AppConfig } from "../../src/platform/config/config.js";
import { installedModuleData } from "../../src/platform/migrate/installed-modules.js";
import type { SeedName } from "../../src/platform/migrate/module-data.js";
import { migrateModules, seedModules } from "../../src/platform/migrate/runner.js";
import { installTestLicense, issueTestLicense } from "./license.js";
import { testConfig } from "./test-config.js";

/** Password akun seed di lingkungan uji; hanya dipakai container sekali pakai. */
export const SEED_USER_PASSWORD = "Seed-Test-Password-1";
export const seedContext = { userPassword: SEED_USER_PASSWORD };

export interface TestDatabase {
  /** Role pemilik skema untuk menyiapkan data uji di luar RLS. */
  owner: pg.Pool;
  /** Role aplikasi `cikal_app` tanpa `BYPASSRLS`. */
  app: pg.Pool;
  appUrl: string;
  config: AppConfig;
  stop(): Promise<void>;
}

/**
 * PostgreSQL 17 dengan role seperti instalasi (initdb `10-roles.sh`), sudah dimigrasi dan di-seed. Lisensi seed dev
 * company 001 diganti lisensi POC bertanda tangan kunci uji, karena uji tidak memegang kunci privat dev.
 */
export async function startDatabase(seed: SeedName = "dev"): Promise<TestDatabase> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer("postgres:17-alpine").start();
  const admin = new pg.Client({ connectionString: container.getConnectionUri() });
  await admin.connect();
  await admin.query("create role cikal_owner login password 'owner'");
  await admin.query("create role cikal_app login nobypassrls password 'app'");
  await admin.query(`alter database ${container.getDatabase()} owner to cikal_owner`);
  await admin.end();

  const url = (user: string, password: string) =>
    `postgres://${user}:${password}@${container.getHost()}:${container.getPort()}/${container.getDatabase()}`;
  const appUrl = url("cikal_app", "app");
  const owner = new pg.Pool({ connectionString: url("cikal_owner", "owner"), max: 3 });
  const app = new pg.Pool({ connectionString: appUrl, max: 2 });
  await migrateModules(owner, installedModuleData, "cikal_app");
  await seedModules(owner, installedModuleData, seed, seedContext);
  if (seed !== "base") await installTestLicense(owner, issueTestLicense());

  return {
    owner,
    app,
    appUrl,
    config: testConfig({ database: { url: appUrl, migrationUrl: null, poolMax: 4 } }),
    async stop() {
      await app.end();
      await owner.end();
      await container.stop();
    },
  };
}

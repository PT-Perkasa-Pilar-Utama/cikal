import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { installedModuleData } from "../src/platform/migrate/installed-modules.js";
import type { OpsSignal } from "../src/platform/migrate/runner.js";
import {
  latestMigration,
  listTenants,
  migrateModules,
  ResetInProgressError,
  resetState,
  seedModules,
} from "../src/platform/migrate/runner.js";
import { listenOpsSignals } from "../src/platform/ops/ops-signals.js";
import { seedContext } from "./support/database.js";

/** Runner migrasi, seed, dan reset terhadap PostgreSQL 17 dengan role seperti instalasi (technical-specs 06 §6.12). */
describe("migrate runner", () => {
  let container: StartedPostgreSqlContainer;
  let owner: pg.Pool;
  let app: pg.Pool;
  let appUrl: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    const admin = new pg.Client({ connectionString: container.getConnectionUri() });
    await admin.connect();
    await admin.query("create role cikal_owner login password 'owner'");
    await admin.query("create role cikal_app login nobypassrls password 'app'");
    await admin.query(`alter database ${container.getDatabase()} owner to cikal_owner`);
    await admin.end();
    const url = (user: string, password: string) =>
      `postgres://${user}:${password}@${container.getHost()}:${container.getPort()}/${container.getDatabase()}`;
    appUrl = url("cikal_app", "app");
    owner = new pg.Pool({ connectionString: url("cikal_owner", "owner"), max: 3 });
    app = new pg.Pool({ connectionString: appUrl, max: 2 });
  });

  afterAll(async () => {
    await app?.end();
    await owner?.end();
    await container?.stop();
  });

  it("applies the platform and each licensed module's migrations once and records them in the module ledger", async () => {
    expect(await migrateModules(owner, installedModuleData, "cikal_app")).toBe(25);
    expect(await migrateModules(owner, installedModuleData, "cikal_app")).toBe(0);
    expect(await latestMigration(app, installedModuleData)).toBe("platform/0001_tenant_keys");
  });

  it("applies seed layers idempotently", async () => {
    await seedModules(owner, installedModuleData, "qa", seedContext);
    await seedModules(owner, installedModuleData, "qa", seedContext);
    expect(await listTenants(owner)).toEqual(["001"]);
  });

  it("gives Admin Sistem every Product right in the qa seed (MRTM TRM_ACC_004)", async () => {
    const { rows } = await owner.query(
      `select can_view, can_create, can_update, can_delete, can_approve from iam.role_access ra
       join iam.roles r on r.id = ra.role_id join iam.menus m on m.id = ra.menu_id
       where r.role_name = 'Admin Sistem' and m.menu_code = 'MST-PRODUCT'`,
    );
    expect(rows).toEqual([{ can_view: true, can_create: true, can_update: true, can_delete: true, can_approve: true }]);
  });

  it("lets the application role read and write data but not change the schema", async () => {
    const { rows } = await app.query("select company_code from tenancy.companies");
    expect(rows).toEqual([{ company_code: "001" }]);
    await expect(app.query("drop schema tenancy cascade")).rejects.toThrow(/must be owner/);
  });

  it("TL-S3-05 resets state, provisions tenant keys, and signals api and worker", async () => {
    await owner.query(
      "insert into tenancy.companies (id, company_code, company_name, address) values ($1, '002', 'Uji', 'Alamat')",
      ["0192b6a0-0002-7000-8000-000000000002"],
    );
    const signals: OpsSignal[] = [];
    const stop = listenOpsSignals(appUrl, (signal) => signals.push(signal));
    await new Promise((resolve) => setTimeout(resolve, 500));

    const result = await resetState({
      appEnv: "test",
      pool: owner,
      modules: installedModuleData,
      appRole: "cikal_app",
      seed: "qa",
      seedContext,
      emptyBucket: async () => 3,
    });

    expect(result).toMatchObject({
      seed: "qa",
      migrationsApplied: 25,
      tenantsSeeded: ["001"],
      bucketObjectsDeleted: 3,
    });
    await expect(app.query("select company_code from tenancy.companies")).resolves.toMatchObject({ rowCount: 1 });
    await new Promise((resolve) => setTimeout(resolve, 500));
    await stop();
    const keys = await owner.query("select key_purpose, status from platform.tenant_keys order by key_purpose");
    expect(keys.rows).toEqual([
      { key_purpose: "BLIND_INDEX", status: "ACTIVE" },
      { key_purpose: "ENCRYPTION", status: "ACTIVE" },
    ]);
    expect(signals).toEqual(["reset_started", "reset_finished"]);
  });

  it("refuses a concurrent reset with RESET_IN_PROGRESS", async () => {
    const holder = await owner.connect();
    try {
      await holder.query("select pg_advisory_lock(7302200101)");
      await expect(
        resetState({
          appEnv: "test",
          pool: owner,
          modules: installedModuleData,
          appRole: "cikal_app",
          seed: "qa",
          seedContext,
          emptyBucket: async () => 0,
        }),
      ).rejects.toBeInstanceOf(ResetInProgressError);
    } finally {
      await holder.query("select pg_advisory_unlock(7302200101)");
      holder.release();
    }
  });

  it("refuses to reset in production", async () => {
    await expect(
      resetState({
        appEnv: "production",
        pool: owner,
        modules: installedModuleData,
        appRole: null,
        seed: "qa",
        seedContext,
        emptyBucket: async () => 0,
      }),
    ).rejects.toThrow("Reset is not allowed in production");
  });
});

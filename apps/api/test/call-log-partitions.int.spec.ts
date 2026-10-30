import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CallLogPartitionsRepository } from "../src/modules/core/integration/db/call-log-partitions.repository.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { businessDate } from "../src/platform/clock/business-date.js";
import { installedModuleData } from "../src/platform/migrate/installed-modules.js";
import { migrateModules, seedModules } from "../src/platform/migrate/runner.js";
import { seedContext, startDatabase, type TestDatabase } from "./support/database.js";

const PARENT = "integration.integration_call_logs";
/** Migrasi integration sebelum tabel dipartisi: registry dan kunci primer (id, started_at). */
const MIGRATIONS_BEFORE_PARTITIONS = 2;

/** Bulan Asia/Jakarta `offset` bulan dari bulan berjalan, sebagai `{ suffix: "YYYYMM", day: "YYYY-MM-15" }`. */
function month(offset: number): { suffix: string; day: string } {
  const [year = 0, current = 1] = businessDate(new Date()).split("-").map(Number);
  const index = year * 12 + (current - 1) + offset;
  const mm = String((index % 12) + 1).padStart(2, "0");
  const yyyy = String(Math.floor(index / 12));
  return { suffix: `${yyyy}${mm}`, day: `${yyyy}-${mm}-15` };
}

async function partitions(db: pg.Pool): Promise<string[]> {
  const { rows } = await db.query<{ name: string }>(
    `select child.relname as name from pg_inherits inh join pg_class child on child.oid = inh.inhrelid
     where inh.inhparent = $1::regclass order by 1`,
    [PARENT],
  );
  return rows.map((row) => row.name);
}

const callLog = (startedAt: string) => ({
  id: uuidv7(),
  tenantId: seedCompanyIds.company001,
  startedAt: `${startedAt}T09:00:00+07:00`,
});

const INSERT_CALL_LOG = `insert into ${PARENT}
  (id, tenant_id, module_code, direction, correlation_id, attempt, started_at, duration_ms, status, request_masked)
  values ($1, $2, 'M07', 'OUTBOUND', 'c-1', 1, $3, 10, 'SUCCESS', '{}')`;

async function insertAsOwner(db: pg.Pool, row: ReturnType<typeof callLog>): Promise<void> {
  await db.query(INSERT_CALL_LOG, [row.id, row.tenantId, row.startedAt]);
}

/** Partisi bulanan `integration_call_logs` (technical-specs 06 §6.10, NF-31; issue #94). */
describe("integration call log partitions", () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await startDatabase("dev");
  });

  afterAll(async () => {
    await db?.stop();
  });

  it("partitions the call logs by month with the current and the next two months", async () => {
    const { rows } = await db.owner.query<{ strategy: string; column: string }>(
      `select pt.partstrat as strategy, a.attname as column from pg_partitioned_table pt
       join pg_attribute a on a.attrelid = pt.partrelid and a.attnum = pt.partattrs[0]
       where pt.partrelid = $1::regclass`,
      [PARENT],
    );

    expect(rows).toEqual([{ strategy: "r", column: "started_at" }]);
    expect(await partitions(db.owner)).toEqual(
      expect.arrayContaining([0, 1, 2].map((offset) => `integration_call_logs_p${month(offset).suffix}`)),
    );
  });

  it("stores a call log written by the app role in the partition of its Asia/Jakarta month", async () => {
    const row = callLog(month(0).day);
    const client = await db.app.connect();
    try {
      await client.query("begin");
      await client.query("select set_config('app.tenant_id', $1, true)", [row.tenantId]);
      await client.query(INSERT_CALL_LOG, [row.id, row.tenantId, row.startedAt]);
      await client.query("commit");
    } finally {
      client.release();
    }

    const { rows } = await db.owner.query<{ partition: string }>(
      `select tableoid::regclass::text as partition from ${PARENT} where id = $1`,
      [row.id],
    );
    expect(rows).toEqual([{ partition: `integration.integration_call_logs_p${month(0).suffix}` }]);
  });

  it("drops partitions older than one year and keeps the last twelve months when the app role maintains them", async () => {
    for (const offset of [-13, -12]) {
      await db.owner.query("select integration.create_call_log_partition($1::date)", [month(offset).day]);
      await insertAsOwner(db.owner, callLog(month(offset).day));
    }

    await new CallLogPartitionsRepository(drizzle(db.app)).maintain();

    const names = await partitions(db.owner);
    expect(names).not.toContain(`integration_call_logs_p${month(-13).suffix}`);
    expect(names).toContain(`integration_call_logs_p${month(-12).suffix}`);
    expect(names).toContain(`integration_call_logs_p${month(2).suffix}`);
  });

  it("refuses the app role direct writes to a partition and creating partitions itself", async () => {
    const row = callLog(month(0).day);
    const partition = `integration.integration_call_logs_p${month(0).suffix}`;

    await expect(
      db.app.query(
        `insert into ${partition} (id, tenant_id, module_code, direction, correlation_id, attempt, started_at,
         duration_ms, status, request_masked) values ($1, $2, 'M07', 'OUTBOUND', 'c-1', 1, $3, 10, 'SUCCESS', '{}')`,
        [row.id, row.tenantId, row.startedAt],
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      db.app.query("select integration.create_call_log_partition($1::date)", [month(6).day]),
    ).rejects.toThrow(/permission denied/);
  });
});

/** Migrasi `0002_call_log_partitions` memindahkan baris tabel lama ke partisi bulannya lalu menerapkan retensi. */
describe("call log partition migration", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>;
  let owner: pg.Pool;
  let folder: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    const admin = new pg.Client({ connectionString: container.getConnectionUri() });
    await admin.connect();
    await admin.query("create role cikal_owner login password 'owner'");
    await admin.query("create role cikal_app login nobypassrls password 'app'");
    await admin.query(`alter database ${container.getDatabase()} owner to cikal_owner`);
    await admin.end();
    owner = new pg.Pool({
      connectionString: `postgres://cikal_owner:owner@${container.getHost()}:${container.getPort()}/${container.getDatabase()}`,
      max: 2,
    });

    // Salinan folder migrasi integration yang berhenti sebelum partisi, untuk meniru database sebelum rilis ini.
    const integration = installedModuleData.find((module) => module.schema === "integration");
    if (!integration) throw new Error("integration module is not installed");
    folder = mkdtempSync(join(tmpdir(), "cikal-integration-migrations-"));
    cpSync(integration.migrationsFolder, folder, { recursive: true });
    const journalPath = join(folder, "meta", "_journal.json");
    const journal = JSON.parse(readFileSync(journalPath, "utf8"));
    journal.entries = journal.entries.slice(0, MIGRATIONS_BEFORE_PARTITIONS);
    writeFileSync(journalPath, JSON.stringify(journal));
    const before = installedModuleData.map((module) =>
      module === integration ? { ...module, migrationsFolder: folder, afterMigrate: null } : module,
    );
    await migrateModules(owner, before, "cikal_app");
    await seedModules(owner, before, "dev", seedContext);
  });

  afterAll(async () => {
    await owner?.end();
    await container?.stop();
    if (folder) rmSync(folder, { recursive: true, force: true });
  });

  it("moves existing call logs into monthly partitions and drops those older than one year", async () => {
    const recent = callLog(month(-1).day);
    const expired = callLog(month(-14).day);
    await insertAsOwner(owner, recent);
    await insertAsOwner(owner, expired);

    await migrateModules(owner, installedModuleData, "cikal_app");

    const { rows } = await owner.query<{ id: string; partition: string }>(
      `select id, tableoid::regclass::text as partition from ${PARENT} order by started_at`,
    );
    expect(rows).toEqual([{ id: recent.id, partition: `integration.integration_call_logs_p${month(-1).suffix}` }]);
    expect(await partitions(owner)).not.toContain(`integration_call_logs_p${month(-14).suffix}`);
  });
});

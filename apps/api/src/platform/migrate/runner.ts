import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { type ModuleData, SEED_LAYERS, type SeedName } from "./module-data.js";

/** Ledger per skema modul (MS-04). */
export const MIGRATIONS_TABLE = "__migrations";

/** Channel LISTEN/NOTIFY operasional; api dan worker berlangganan lewat `listenOpsSignals`. */
export const OPS_CHANNEL = "cikal_ops";
export type OpsSignal = "reset_started" | "reset_finished";

/** Skema antrean pg-boss; ikut dihapus saat reset (api-specs 27 §27.4 langkah 3). */
const QUEUE_SCHEMA = "pgboss";
const RESET_LOCK_KEY = 7_302_200_101;

export class ResetInProgressError extends Error {
  constructor() {
    super("Another reset is in progress");
    this.name = "ResetInProgressError";
  }
}

/** Reset selalu menerapkan seed berisi data uji; `base` saja dipakai instalasi production yang tidak boleh reset. */
export type ResetSeedName = Exclude<SeedName, "base">;

export interface ResetResult {
  seed: ResetSeedName;
  durationMs: number;
  migrationsApplied: number;
  tenantsSeeded: string[];
  bucketObjectsDeleted: number;
}

type Queryable = pg.Pool | pg.PoolClient;

const ident = (name: string) => pg.escapeIdentifier(name);
const ledger = (schema: string) => `${ident(schema)}.${ident(MIGRATIONS_TABLE)}`;

interface JournalEntry {
  tag: string;
  when: number;
}

function readJournal(module: ModuleData): JournalEntry[] | null {
  const path = join(module.migrationsFolder, "meta", "_journal.json");
  if (!existsSync(path)) return null;
  return (JSON.parse(readFileSync(path, "utf8")) as { entries: JournalEntry[] }).entries;
}

async function countApplied(db: Queryable, schema: string): Promise<number> {
  const { rows } = await db.query<{ found: string | null }>("select to_regclass($1) as found", [ledger(schema)]);
  if (!rows[0]?.found) return 0;
  const count = await db.query<{ n: string }>(`select count(*) as n from ${ledger(schema)}`);
  return Number(count.rows[0]?.n ?? 0);
}

/** Hak role aplikasi (tanpa `BYPASSRLS`) atas tabel yang dibuat role pemilik skema. */
async function grantAppRole(db: Queryable, schema: string, appRole: string): Promise<void> {
  const s = ident(schema);
  const r = ident(appRole);
  await db.query(`grant usage on schema ${s} to ${r}`);
  await db.query(`grant select, insert, update, delete on all tables in schema ${s} to ${r}`);
  await db.query(`grant usage, select on all sequences in schema ${s} to ${r}`);
  await db.query(`alter default privileges in schema ${s} grant select, insert, update, delete on tables to ${r}`);
  await db.query(`alter default privileges in schema ${s} grant usage, select on sequences to ${r}`);
}

/** Role aplikasi dari `DATABASE_URL`; `null` bila sama dengan role migrasi sehingga tidak perlu grant. */
export function appRoleFor(databaseUrl: string | undefined, migrationUrl: string): string | null {
  if (!databaseUrl) return null;
  const app = decodeURIComponent(new URL(databaseUrl).username);
  return app && app !== decodeURIComponent(new URL(migrationUrl).username) ? app : null;
}

/**
 * Menjalankan migrasi setiap modul berlisensi sesuai urutan dependensi (MS-04).
 * Modul tanpa `meta/_journal.json` belum punya migrasi dan dilewati. Mengembalikan jumlah migrasi baru.
 */
export async function migrateModules(
  pool: pg.Pool,
  modules: readonly ModuleData[],
  appRole: string | null,
): Promise<number> {
  const db = drizzle(pool);
  let applied = 0;
  for (const module of modules) {
    if (!readJournal(module)) continue;
    const before = await countApplied(pool, module.schema);
    await migrate(db, {
      migrationsFolder: module.migrationsFolder,
      migrationsSchema: module.schema,
      migrationsTable: MIGRATIONS_TABLE,
    });
    applied += (await countApplied(pool, module.schema)) - before;
    if (appRole) await grantAppRole(pool, module.schema, appRole);
  }
  return applied;
}

/** Menerapkan lapisan seed (`qa` = base, dev, qa) untuk semua modul dalam satu transaksi. */
export async function seedModules(pool: pg.Pool, modules: readonly ModuleData[], seed: SeedName): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const db = drizzle(client);
    for (const layer of SEED_LAYERS[seed]) {
      for (const module of modules) {
        await module.seeds[layer]?.(db);
      }
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** Kode company hasil seed, untuk respons reset. */
export async function listTenants(db: Queryable): Promise<string[]> {
  const { rows } = await db.query<{ found: string | null }>("select to_regclass('tenancy.companies') as found");
  if (!rows[0]?.found) return [];
  const companies = await db.query<{ company_code: string }>(
    "select company_code from tenancy.companies order by company_code",
  );
  return companies.rows.map((row) => row.company_code);
}

/** Migrasi terakhir di semua ledger, dalam bentuk `<skema>/<tag>`; `null` bila belum ada migrasi. */
export async function latestMigration(db: Queryable, modules: readonly ModuleData[]): Promise<string | null> {
  const { rows } = await db.query<{ schema: string }>(
    `select n.nspname as schema from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relname = $1`,
    [MIGRATIONS_TABLE],
  );
  const present = new Set(rows.map((row) => row.schema));
  let latest: { when: number; name: string } | null = null;
  for (const module of modules) {
    if (!present.has(module.schema)) continue;
    const result = await db.query<{ latest: string | null }>(
      `select max(created_at) as latest from ${ledger(module.schema)}`,
    );
    const when = Number(result.rows[0]?.latest ?? 0);
    const entry = readJournal(module)?.find((e) => e.when === when);
    if (entry && (!latest || when > latest.when)) latest = { when, name: `${module.schema}/${entry.tag}` };
  }
  return latest?.name ?? null;
}

async function notify(db: Queryable, signal: OpsSignal): Promise<void> {
  await db.query("select pg_notify($1, $2)", [OPS_CHANNEL, signal]);
}

/**
 * Mengembalikan database ke keadaan awal (api-specs 27 §27.4): kunci advisory, sinyal `reset_started`,
 * DROP skema modul dan antrean, migrasi, seed, kosongkan bucket, sinyal `reset_finished`.
 * `pool` wajib memakai role pemilik skema. Production sudah ditolak di registrasi rute dan CLI; pemeriksaan
 * di sini lapisan terakhir.
 */
export async function resetState(options: {
  appEnv: string;
  pool: pg.Pool;
  modules: readonly ModuleData[];
  appRole: string | null;
  seed: ResetSeedName;
  emptyBucket: () => Promise<number>;
}): Promise<ResetResult> {
  const { pool, modules, appRole, seed } = options;
  if (options.appEnv === "production") throw new Error("Reset is not allowed in production");
  const started = performance.now();
  const client = await pool.connect();
  try {
    const lock = await client.query<{ locked: boolean }>("select pg_try_advisory_lock($1) as locked", [RESET_LOCK_KEY]);
    if (!lock.rows[0]?.locked) throw new ResetInProgressError();
    try {
      await notify(client, "reset_started");
      for (const schema of [...modules.map((m) => m.schema), QUEUE_SCHEMA]) {
        await client.query(`drop schema if exists ${ident(schema)} cascade`);
      }
      const migrationsApplied = await migrateModules(pool, modules, appRole);
      await seedModules(pool, modules, seed);
      const tenantsSeeded = await listTenants(pool);
      const bucketObjectsDeleted = await options.emptyBucket();
      return {
        seed,
        durationMs: Math.round(performance.now() - started),
        migrationsApplied,
        tenantsSeeded,
        bucketObjectsDeleted,
      };
    } finally {
      await notify(client, "reset_finished");
      await client.query("select pg_advisory_unlock($1)", [RESET_LOCK_KEY]);
    }
  } finally {
    client.release();
  }
}

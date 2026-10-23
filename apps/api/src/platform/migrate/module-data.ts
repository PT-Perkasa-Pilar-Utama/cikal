import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { QueueDefinition } from "../queue/queue-definition.js";

/** Lapisan seed (technical-specs 06 §6.12 MS-07). `dev` dibangun di atas `base`, `qa` di atas `dev`. */
export type SeedName = "base" | "dev" | "qa";

export const SEED_LAYERS: Record<SeedName, readonly SeedName[]> = {
  base: ["base"],
  dev: ["base", "dev"],
  qa: ["base", "dev", "qa"],
};

/** Masukan seed dari luar repo. `userPassword` adalah password akun seed dev dan qa dari vault (DEPLOYMENT_PLAN §6.5). */
export interface SeedContext {
  userPassword: string | null;
}

/** Seed berjalan sebagai role pemilik skema di dalam satu transaksi; wajib idempoten (`ON CONFLICT DO NOTHING`). */
export type ModuleSeed = (db: NodePgDatabase, ctx: SeedContext) => Promise<void>;

/**
 * Kontrak satu modul terhadap runner migrasi: skema, folder migrasi, dan seed per lapisan.
 * Setiap modul mengekspornya dari `index.ts`; generator paket menyusun daftar modul berlisensi terurut dependensi.
 */
export interface ModuleData {
  code: string;
  schema: string;
  migrationsFolder: string;
  seeds: Partial<Record<SeedName, ModuleSeed>>;
  /** Tabel yang bagi role aplikasi hanya boleh `SELECT` dan `INSERT`, contoh jejak audit (AD-03). */
  appendOnlyTables: readonly string[];
  /** Antrean pg-boss milik modul, dibuat runner bersama migrasi. */
  queues: readonly QueueDefinition[];
}

/** `moduleUrl` diisi `import.meta.url` milik modul, sehingga folder migrasi tidak pernah berupa path absolut (MS-02). */
export function defineModuleData(
  moduleUrl: string,
  data: {
    code: string;
    schema: string;
    seeds?: Partial<Record<SeedName, ModuleSeed>>;
    appendOnlyTables?: readonly string[];
    queues?: readonly QueueDefinition[];
  },
): ModuleData {
  return {
    ...data,
    migrationsFolder: join(dirname(fileURLToPath(moduleUrl)), "db", "migrations"),
    seeds: data.seeds ?? {},
    appendOnlyTables: data.appendOnlyTables ?? [],
    queues: data.queues ?? [],
  };
}

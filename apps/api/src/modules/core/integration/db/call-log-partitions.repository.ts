import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { type Database, DB } from "../../../../platform/db/database.js";

/**
 * Partisi bulanan `integration_call_logs` lewat fungsi SECURITY DEFINER milik role pemilik skema (migrasi
 * `0002_call_log_partitions`): bulan berjalan dan 2 bulan berikutnya dibuat, partisi lebih dari 1 tahun dihapus (NF-31).
 */
export async function maintainCallLogPartitions(db: NodePgDatabase): Promise<void> {
  await db.execute(sql`select integration.maintain_call_log_partitions()`);
}

/** Pemeliharaan partisi dari job harian worker; tabel tidak berisi data tenant, jadi tanpa `withTenantTx`. */
@Injectable()
export class CallLogPartitionsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  maintain(): Promise<void> {
    return maintainCallLogPartitions(this.db);
  }
}

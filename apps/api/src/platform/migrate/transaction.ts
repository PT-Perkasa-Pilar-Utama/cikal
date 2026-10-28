import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type pg from "pg";

/** Satu transaksi role pemilik skema untuk seed dan provisioning runner; error membatalkan semua penulisan. */
export async function inTransaction<T>(pool: pg.Pool, fn: (db: NodePgDatabase) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await fn(drizzle(client));
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

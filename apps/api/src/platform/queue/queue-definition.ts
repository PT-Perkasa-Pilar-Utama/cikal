import type PgBoss from "pg-boss";

/** Skema antrean pg-boss (technical-specs 04 §4.4); ikut dihapus saat reset (api-specs 27 §27.4 langkah 3). */
export const QUEUE_SCHEMA = "pgboss";

/**
 * Antrean pg-boss milik satu modul: nama, kebijakan, retry, dan antrean dead-letter. Antrean dibuat runner
 * migrasi dengan role pemilik skema, karena pg-boss membuat tabel partisi per antrean (DDL).
 */
export type QueueDefinition = PgBoss.Queue;

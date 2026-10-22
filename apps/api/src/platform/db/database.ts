import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export const DB_POOL = Symbol("DB_POOL");
export const DB = Symbol("DB");
export type Database = NodePgDatabase;

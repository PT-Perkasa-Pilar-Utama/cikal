import { Global, Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { APP_CONFIG, type AppConfig } from "../config/config.js";

export const DB_POOL = Symbol("DB_POOL");
export const DB = Symbol("DB");
export type Database = NodePgDatabase;

/** Koneksi PostgreSQL bersama. Akses data bisnis lewat `withTenantTx` (dipasang di TL-S1-03). */
@Global()
@Module({
  providers: [
    {
      provide: DB_POOL,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        new pg.Pool({ connectionString: config.database.url, max: config.database.poolMax }),
    },
    { provide: DB, inject: [DB_POOL], useFactory: (pool: pg.Pool): Database => drizzle(pool) },
  ],
  exports: [DB_POOL, DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DB_POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

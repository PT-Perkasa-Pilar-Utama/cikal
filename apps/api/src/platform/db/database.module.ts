import { Global, Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { APP_CONFIG, type AppConfig } from "../config/config.js";
import { type Database, DB, DB_POOL } from "./database.js";
import { TenantTx } from "./tenant-tx.js";

/** Koneksi PostgreSQL bersama. Akses data bisnis lewat `TenantTx.withTenantTx` (technical-specs 05 §5.0.1). */
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
    TenantTx,
  ],
  exports: [DB_POOL, DB, TenantTx],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DB_POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

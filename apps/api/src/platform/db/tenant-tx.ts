import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { type Database, DB } from "./database.js";

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Konteks tenant yang dipasang di setiap transaksi data bisnis; selalu dari sesi, tidak dari request (API-03). */
export interface TenantContext {
  tenantId: string;
  userId: string;
}

/**
 * Kunci pencarian pra-tenant (technical-specs 06 DM-12): satu-satunya cara membaca baris ber-RLS sebelum
 * tenant diketahui, terbatas pada baris yang kuncinya diketahui pemanggil.
 */
export type LookupKey = "app.session_token_hash" | "app.login_username";

/** Memasang `app.tenant_id` dan `app.user_id` untuk sisa transaksi (`SET LOCAL`, DM-09). */
export async function bindTenant(tx: Tx, ctx: TenantContext): Promise<void> {
  await tx.execute(
    sql`select set_config('app.tenant_id', ${ctx.tenantId}, true), set_config('app.user_id', ${ctx.userId}, true)`,
  );
}

/** Tenant yang terpasang di transaksi (`app.tenant_id`), atau `null` bila belum ada. */
export async function boundTenantId(tx: Tx): Promise<string | null> {
  const { rows } = await tx.execute<{ tenant_id: string | null }>(
    sql`select nullif(current_setting('app.tenant_id', true), '') as tenant_id`,
  );
  return rows[0]?.tenant_id ?? null;
}

/** Transaksi data bisnis (technical-specs 05 §5.0.1). */
@Injectable()
export class TenantTx {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** `withTenantTx(ctx, fn)`: tanpa tenant, RLS menolak semua baris. */
  withTenantTx<T>(ctx: TenantContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      await bindTenant(tx, ctx);
      return fn(tx);
    });
  }

  /**
   * Transaksi job worker tanpa user, dengan tenant dari payload job (technical-specs 12 §12.5). `app.user_id`
   * kosong; penulisan mencatat pelaku `null`.
   */
  withSystemTx<T>(tenantId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true), set_config('app.user_id', '', true)`);
      return fn(tx);
    });
  }

  /** Transaksi pra-tenant dengan satu kunci DM-12; `fn` boleh memanggil `bindTenant` setelah tenant ditemukan. */
  withLookupTx<T>(key: LookupKey, value: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select set_config(${key}, ${value}, true)`);
      return fn(tx);
    });
  }
}

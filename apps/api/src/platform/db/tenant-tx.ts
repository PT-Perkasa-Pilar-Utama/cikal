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

  /** Transaksi pra-tenant dengan satu kunci DM-12; `fn` boleh memanggil `bindTenant` setelah tenant ditemukan. */
  withLookupTx<T>(key: LookupKey, value: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select set_config(${key}, ${value}, true)`);
      return fn(tx);
    });
  }
}

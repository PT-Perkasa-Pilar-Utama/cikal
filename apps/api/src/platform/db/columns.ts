import { sql } from "drizzle-orm";
import { customType, pgPolicy, timestamp, uuid } from "drizzle-orm/pg-core";

/** Kolom `bytea` untuk hash dan ciphertext (technical-specs 06 DM-08). */
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/** Kolom standar DM-03 selain `tenant_id`, yang ditulis tiap tabel bersama foreign key-nya. */
export const auditColumns = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by"),
});

/**
 * Policy DM-09 untuk setiap tabel ber-`tenant_id`. `nullif` membuat transaksi tanpa `app.tenant_id` melihat nol
 * baris, bukan gagal karena string kosong tidak bisa menjadi uuid.
 */
export const tenantIsolation = () =>
  pgPolicy("tenant_isolation", {
    as: "permissive",
    for: "all",
    using: sql`tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid`,
    withCheck: sql`tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid`,
  });

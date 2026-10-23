import { sql } from "drizzle-orm";
import { check, integer, jsonb, pgSchema, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { auditColumns, bytea, tenantIsolation } from "./columns.js";

export const platform = pgSchema("platform");

/**
 * Kunci `Idempotency-Key` per user, disimpan 24 jam (api-specs 01 §1.7). `tenant_id` dan `user_id` tanpa foreign
 * key: skema platform dimigrasi sebelum modul mana pun dan tidak bergantung pada modul (technical-specs 06 §6.3).
 */
export const idempotencyKeys = platform.table(
  "idempotency_keys",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    userId: uuid("user_id").notNull(),
    idempotencyKey: uuid("idempotency_key").notNull(),
    requestHash: bytea("request_hash").notNull(),
    /** Kosong selama permintaan pertama masih diproses. */
    responseStatus: integer("response_status"),
    responseBody: jsonb("response_body"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...auditColumns(),
  },
  (table) => [unique("idempotency_keys_user_key_unique").on(table.userId, table.idempotencyKey), tenantIsolation()],
);

/** Kunci tenant dibungkus master key; platform dimigrasi sebelum tenancy sehingga tanpa FK (tech 06 §6.3). */
export const tenantKeys = platform.table(
  "tenant_keys",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    keyPurpose: text("key_purpose").$type<"ENCRYPTION" | "BLIND_INDEX">().notNull(),
    wrappedKey: bytea("wrapped_key").notNull(),
    keyVersion: integer("key_version").notNull().default(1),
    status: text("status").$type<"ACTIVE" | "RETIRED">().notNull().default("ACTIVE"),
    ...auditColumns(),
  },
  (table) => [
    unique("tenant_keys_tenant_purpose_version_unique").on(table.tenantId, table.keyPurpose, table.keyVersion),
    uniqueIndex("tenant_keys_active_unique")
      .on(table.tenantId, table.keyPurpose)
      .where(sql`${table.status} = 'ACTIVE'`),
    check("tenant_keys_purpose_check", sql`${table.keyPurpose} in ('ENCRYPTION', 'BLIND_INDEX')`),
    check("tenant_keys_status_check", sql`${table.status} in ('ACTIVE', 'RETIRED')`),
    check("tenant_keys_version_check", sql`${table.keyVersion} > 0`),
    tenantIsolation(),
  ],
);

import { integer, jsonb, pgSchema, timestamp, unique, uuid } from "drizzle-orm/pg-core";
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

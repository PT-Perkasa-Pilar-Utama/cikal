import type { ChangeRequestEntityType, ChangeRequestStatus } from "@cikal/contracts";
import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgSchema, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { auditColumns, tenantIsolation } from "../../../../platform/db/columns.js";
import { users } from "../../identity/index.js";
import { companies } from "../../tenancy/index.js";
import { ENTITY_MENU } from "../domain/entity-menus.js";

export const cr = pgSchema("cr");

export type ChangeRequestAction = "CREATE" | "UPDATE";
export type JsonRecord = Record<string, unknown>;

const textList = (values: readonly string[]) => sql.raw(values.map((value) => `'${value}'`).join(", "));

/**
 * Status yang masih menunggu Checker atau Maker (AC-12.06), sebagai literal SQL: predikat `ON CONFLICT` harus
 * sama persis dengan predikat indeks unik parsial agar PostgreSQL bisa memakainya.
 */
const OPEN_STATUSES: readonly ChangeRequestStatus[] = ["WAITING_APPROVAL", "REVISE"];
export const openStatusList = textList(OPEN_STATUSES);

// drizzle-kit memuat file ini sebagai CommonJS, jadi daftar nilai tidak diimpor dari paket kontrak (ESM).
const STATUSES = ["WAITING_APPROVAL", "REVISE", "APPROVED", "REJECTED"] as const satisfies ChangeRequestStatus[];

/** CHANGE_REQUESTS, technical-specs 06 §6.8. `created_at` adalah waktu submit (`submittedAt`). */
export const changeRequests = cr.table(
  "change_requests",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => companies.id),
    entityType: text("entity_type").$type<ChangeRequestEntityType>().notNull(),
    entityId: uuid("entity_id"),
    action: text("action").$type<ChangeRequestAction>().notNull(),
    oldData: jsonb("old_data").$type<JsonRecord>(),
    newData: jsonb("new_data").$type<JsonRecord>().notNull(),
    packageSize: integer("package_size").notNull().default(1),
    status: text("status").$type<ChangeRequestStatus>().notNull().default("WAITING_APPROVAL"),
    reviseReason: text("revise_reason"),
    submittedBy: uuid("submitted_by")
      .notNull()
      .references(() => users.id),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    ...auditColumns(),
  },
  (table) => [
    check("change_requests_entity_type_check", sql`${table.entityType} in (${textList(Object.keys(ENTITY_MENU))})`),
    check("change_requests_action_check", sql`${table.action} in ('CREATE', 'UPDATE')`),
    check("change_requests_status_check", sql`${table.status} in (${textList(STATUSES)})`),
    check("change_requests_package_size_check", sql`${table.packageSize} >= 1`),
    check("change_requests_revise_reason_check", sql`char_length(${table.reviseReason}) <= 500`),
    // Pembuat tidak boleh meninjau permintaannya sendiri (AC-12.04).
    check("change_requests_self_review_check", sql`${table.reviewedBy} <> ${table.submittedBy}`),
    uniqueIndex("change_requests_open_entity_unique")
      .on(table.tenantId, table.entityType, table.entityId)
      .where(sql`${table.status} in (${openStatusList})`),
    index("change_requests_pending_list_idx").on(table.tenantId, table.entityType, table.status, table.createdAt),
    tenantIsolation(),
  ],
);

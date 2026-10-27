import type { ApplicationStatus, StepCode } from "@cikal/contracts";
import { sql } from "drizzle-orm";
import { integer, numeric, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { bytea } from "../../../../platform/db/columns.js";

/** Skema `reporting` hanya berisi view `SELECT` (XM-07, technical-specs 05 §5.17). */
export const reporting = pgSchema("reporting");

/**
 * Baris "Application Inquiry" (api-specs 17 §17.1). `security_invoker` membuat RLS tabel sumber berlaku untuk user
 * yang membaca view, jadi tenant lain tidak terlihat. NIK tetap terenkripsi; penyamaran dilakukan setelah dibuka.
 */
export const applicationInquiry = reporting
  .view("application_inquiry", {
    tenantId: uuid("tenant_id").notNull(),
    id: uuid("id").notNull(),
    loanId: text("loan_id").notNull(),
    fullName: text("full_name").notNull(),
    idCardNumberEnc: bytea("id_card_number_enc").notNull(),
    idCardNumberKeyVersion: integer("id_card_number_key_version").notNull(),
    productId: uuid("product_id").notNull(),
    productCode: text("product_code").notNull(),
    branchId: uuid("branch_id"),
    branchCode: text("branch_code"),
    requestedLimit: numeric("requested_limit", { precision: 18, scale: 2 }),
    status: text("status").$type<ApplicationStatus>().notNull(),
    state: text("state").$type<StepCode>(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    modifiedAt: timestamp("modified_at", { withTimezone: true }).notNull(),
    createdBy: uuid("created_by"),
  })
  .with({ securityInvoker: true })
  .as(sql`
    select a.tenant_id, a.id, a.loan_id, p.full_name, p.id_card_number_enc, p.id_card_number_key_version,
      a.product_id, pr.product_code, a.branch_id, b.branch_code, a.requested_limit, a.status,
      a.current_step as state, a.submitted_at, a.updated_at as modified_at, a.created_by
    from application.applications a
    join application.application_personals p on p.application_id = a.id
    join product.products pr on pr.id = a.product_id
    left join org.branches b on b.id = a.branch_id
  `);

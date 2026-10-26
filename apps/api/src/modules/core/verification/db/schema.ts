import type { VerificationResult } from "@cikal/contracts";
import { sql } from "drizzle-orm";
import { check, index, pgSchema, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { auditColumns, tenantIsolation } from "../../../../platform/db/columns.js";
import { applications } from "../../application/index.js";
import { users } from "../../identity/index.js";
import { companies } from "../../tenancy/index.js";

export const verification = pgSchema("verification");

/**
 * DOCUMENT_VERIFICATIONS, technical-specs 06 §6.10: satu verifikasi per ProcessInstance. Status per dokumen ada di
 * `application.application_documents` milik Application (XM-02).
 */
export const documentVerifications = verification.table(
  "document_verifications",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => companies.id),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id),
    processInstanceId: uuid("process_instance_id").notNull(),
    verifierUserId: uuid("verifier_user_id").references(() => users.id),
    result: text("result").$type<VerificationResult>().notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex("document_verifications_process_unique").on(table.processInstanceId),
    index("document_verifications_application_idx").on(table.applicationId),
    check("document_verifications_result_check", sql`${table.result} in ('IN_PROGRESS', 'ALL_MATCH', 'HAS_NOT_MATCH')`),
    tenantIsolation(),
  ],
);

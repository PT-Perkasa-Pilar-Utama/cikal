import type { DukcapilMatchStatus, DukcapilOutcome, DukcapilRuleSnapshot } from "@cikal/contracts";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { auditColumns, bytea, tenantIsolation } from "../../../../platform/db/columns.js";
import { applications } from "../../../core/application/index.js";
import { companies } from "../../../core/tenancy/index.js";

export const m07Dukcapil = pgSchema("m07_dukcapil");

const tenantId = () =>
  uuid("tenant_id")
    .notNull()
    .references(() => companies.id);

/**
 * DUKCAPIL_RULES, technical-specs 06 §6.11 M07: satu aturan per tenant. Bobot nama dan nama ibu berjumlah 100,
 * ambang Review di bawah ambang Passed.
 */
export const dukcapilRules = m07Dukcapil.table(
  "dukcapil_rules",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    nameWeight: numeric("name_weight", { precision: 9, scale: 4 }).notNull(),
    motherNameWeight: numeric("mother_name_weight", { precision: 9, scale: 4 }).notNull(),
    passedThreshold: numeric("passed_threshold", { precision: 5, scale: 4 }).notNull(),
    reviewThreshold: numeric("review_threshold", { precision: 5, scale: 4 }).notNull(),
    notFoundOutcome: text("not_found_outcome").$type<"REVIEW" | "FAILED">().notNull().default("REVIEW"),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex("dukcapil_rules_tenant_unique").on(table.tenantId),
    check("dukcapil_rules_weights_check", sql`${table.nameWeight} + ${table.motherNameWeight} = 100`),
    check("dukcapil_rules_thresholds_check", sql`${table.reviewThreshold} < ${table.passedThreshold}`),
    check("dukcapil_rules_not_found_outcome_check", sql`${table.notFoundOutcome} in ('REVIEW', 'FAILED')`),
    tenantIsolation(),
  ],
);

/**
 * DUKCAPIL_RESULTS, technical-specs 06 §6.11 M07: satu hasil per ProcessInstance. `rule` menyimpan bobot dan ambang
 * saat langkah berjalan; respons mentah penyedia disimpan terenkripsi (IN-06).
 */
export const dukcapilResults = m07Dukcapil.table(
  "dukcapil_results",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id),
    processInstanceId: uuid("process_instance_id").notNull(),
    outcome: text("outcome").$type<DukcapilOutcome>().notNull(),
    recordFound: boolean("record_found").notNull(),
    providerCode: text("provider_code"),
    providerReference: text("provider_reference"),
    dobStatus: text("dob_status").$type<DukcapilMatchStatus>(),
    pobStatus: text("pob_status").$type<DukcapilMatchStatus>(),
    fullNameScore: numeric("full_name_score", { precision: 5, scale: 4 }),
    motherNameScore: numeric("mother_name_score", { precision: 5, scale: 4 }),
    finalScore: numeric("final_score", { precision: 5, scale: 4 }),
    rule: jsonb("rule").$type<DukcapilRuleSnapshot>().notNull(),
    rawResponseEnc: bytea("raw_response_enc"),
    rawResponseKeyVersion: integer("raw_response_key_version"),
    ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex("dukcapil_results_process_unique").on(table.processInstanceId),
    index("dukcapil_results_application_idx").on(table.applicationId),
    check("dukcapil_results_outcome_check", sql`${table.outcome} in ('PASSED', 'REVIEW', 'FAILED', 'SKIP')`),
    check("dukcapil_results_dob_status_check", sql`${table.dobStatus} in ('MATCH', 'NOT_MATCH')`),
    check("dukcapil_results_pob_status_check", sql`${table.pobStatus} in ('MATCH', 'NOT_MATCH')`),
    tenantIsolation(),
  ],
);

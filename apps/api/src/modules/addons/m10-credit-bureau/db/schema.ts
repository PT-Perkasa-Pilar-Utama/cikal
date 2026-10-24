import type { CreditBureauOutcome, IntegrationMode } from "@cikal/contracts";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgSchema,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { auditColumns, bytea, tenantIsolation } from "../../../../platform/db/columns.js";
import { applications } from "../../../core/application/index.js";
import { companies } from "../../../core/tenancy/index.js";

export const m10CreditBureau = pgSchema("m10_credit_bureau");

// drizzle-kit memuat file ini sebagai CommonJS, jadi daftar nilai tidak diimpor dari paket kontrak (ESM).
const OUTCOMES = ["COLLECT_1", "COLLECT_2", "COLLECT_3", "COLLECT_4", "COLLECT_5", "NO_HISTORY"] as const;
const outcomeList = sql.raw(OUTCOMES.map((value) => `'${value}'`).join(", "));

const tenantId = () =>
  uuid("tenant_id")
    .notNull()
    .references(() => companies.id);

/** OUTCOME_MAPPINGS, technical-specs 06 §6.11 M10: kolektibilitas ke kualitas dan hasil Decision Matrix (RM-16). */
export const outcomeMappings = m10CreditBureau.table(
  "outcome_mappings",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    collectibility: integer("collectibility"),
    quality: text("quality").notNull(),
    outcome: text("outcome").$type<CreditBureauOutcome>().notNull(),
    ...auditColumns(),
  },
  (table) => [
    unique("outcome_mappings_collectibility_unique").on(table.tenantId, table.collectibility).nullsNotDistinct(),
    check("outcome_mappings_collectibility_check", sql`${table.collectibility} between 1 and 5`),
    check("outcome_mappings_outcome_check", sql`${table.outcome} in (${outcomeList})`),
    tenantIsolation(),
  ],
);

/** RESULTS, technical-specs 06 §6.11 M10: satu hasil per ProcessInstance; respons mentah terenkripsi (IN-06). */
export const results = m10CreditBureau.table(
  "results",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id),
    processInstanceId: uuid("process_instance_id").notNull(),
    providerCode: text("provider_code").notNull(),
    mode: text("mode").$type<IntegrationMode>().notNull(),
    reportReference: text("report_reference"),
    reportDate: date("report_date"),
    hasHistory: boolean("has_history").notNull(),
    aggregatedCollectibility: integer("aggregated_collectibility"),
    quality: text("quality").notNull(),
    outcome: text("outcome").$type<CreditBureauOutcome>().notNull(),
    reportFileId: uuid("report_file_id"),
    rawResponseEnc: bytea("raw_response_enc"),
    rawResponseKeyVersion: integer("raw_response_key_version"),
    ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex("results_process_unique").on(table.processInstanceId),
    index("results_application_idx").on(table.applicationId),
    check("results_mode_check", sql`${table.mode} in ('SYNC', 'ASYNC', 'MANUAL')`),
    check("results_outcome_check", sql`${table.outcome} in (${outcomeList})`),
    tenantIsolation(),
  ],
);

/** CREDIT_FACILITIES, technical-specs 06 §6.11 M10: fasilitas laporan biro kredit; hanya `ACTIVE` diagregasi. */
export const creditFacilities = m10CreditBureau.table(
  "credit_facilities",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    resultId: uuid("result_id")
      .notNull()
      .references(() => results.id, { onDelete: "cascade" }),
    lenderName: text("lender_name").notNull(),
    facilityType: text("facility_type").notNull(),
    plafond: numeric("plafond", { precision: 18, scale: 2 }).notNull(),
    outstanding: numeric("outstanding", { precision: 18, scale: 2 }).notNull(),
    collectibility: integer("collectibility").notNull(),
    daysPastDue: integer("days_past_due").notNull(),
    condition: text("condition").$type<"ACTIVE" | "CLOSED">().notNull(),
    lastUpdated: date("last_updated"),
    ...auditColumns(),
  },
  (table) => [
    index("credit_facilities_result_idx").on(table.resultId),
    check("credit_facilities_condition_check", sql`${table.condition} in ('ACTIVE', 'CLOSED')`),
    tenantIsolation(),
  ],
);

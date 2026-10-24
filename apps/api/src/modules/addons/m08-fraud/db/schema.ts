import type { FraudOutcome, IpCheckStatus, VelocityDimension, VelocityHit } from "@cikal/contracts";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  inet,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { auditColumns, bytea, tenantIsolation } from "../../../../platform/db/columns.js";
import { applications } from "../../../core/application/index.js";
import { companies } from "../../../core/tenancy/index.js";
import type { IpCondition, NameCondition } from "../domain/fraud-rules.js";

export const m08Fraud = pgSchema("m08_fraud");

// drizzle-kit memuat file ini sebagai CommonJS, jadi daftar nilai tidak diimpor dari paket kontrak (ESM).
const OUTCOMES = sql.raw(["CLEAN", "SUSPICIOUS", "HIGH_FRAUD_POTENTIAL"].map((value) => `'${value}'`).join(", "));
const IP_STATUSES = ["NORMAL", "VPN_PROXY", "LOCATION_MISMATCH", "NOT_APPLICABLE"];
const ipStatusList = sql.raw(IP_STATUSES.map((value) => `'${value}'`).join(", "));
const ipConditionList = sql.raw([...IP_STATUSES, "ANY"].map((value) => `'${value}'`).join(", "));

const tenantId = () =>
  uuid("tenant_id")
    .notNull()
    .references(() => companies.id);

/** FRAUD_MATRIX, technical-specs 06 §6.11 M08: baris pertama menurut `priority` yang cocok dipakai. */
export const fraudMatrix = m08Fraud.table(
  "fraud_matrix",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    priority: integer("priority").notNull(),
    nameCondition: text("name_condition").$type<NameCondition>().notNull(),
    ipCondition: text("ip_condition").$type<IpCondition>().notNull(),
    fraudOutcome: text("fraud_outcome").$type<FraudOutcome>().notNull(),
    ...auditColumns(),
  },
  (table) => [
    index("fraud_matrix_priority_idx").on(table.tenantId, table.priority),
    check("fraud_matrix_priority_check", sql`${table.priority} >= 1`),
    check("fraud_matrix_name_condition_check", sql`${table.nameCondition} in ('NORMAL', 'EXCEEDED', 'ANY')`),
    check("fraud_matrix_ip_condition_check", sql`${table.ipCondition} in (${ipConditionList})`),
    check("fraud_matrix_fraud_outcome_check", sql`${table.fraudOutcome} in (${OUTCOMES})`),
    tenantIsolation(),
  ],
);

/** FRAUD_VELOCITY_RULES, technical-specs 06 §6.11 M08: frekuensi pengajuan per dimensi dalam satu jendela. */
export const fraudVelocityRules = m08Fraud.table(
  "fraud_velocity_rules",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    dimension: text("dimension").$type<VelocityDimension>().notNull(),
    windowValue: integer("window_value").notNull(),
    windowUnit: text("window_unit").$type<"DAY" | "HOUR">().notNull(),
    maxCount: integer("max_count").notNull(),
    outcomeWhenExceeded: text("outcome_when_exceeded").$type<FraudOutcome>().notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns(),
  },
  (table) => [
    check(
      "fraud_velocity_rules_dimension_check",
      sql`${table.dimension} in ('FULL_NAME', 'ID_CARD_NUMBER', 'IP_ADDRESS', 'DEVICE_ID')`,
    ),
    check("fraud_velocity_rules_window_unit_check", sql`${table.windowUnit} in ('DAY', 'HOUR')`),
    check("fraud_velocity_rules_window_value_check", sql`${table.windowValue} >= 1`),
    check("fraud_velocity_rules_max_count_check", sql`${table.maxCount} >= 1`),
    check("fraud_velocity_rules_outcome_check", sql`${table.outcomeWhenExceeded} in (${OUTCOMES})`),
    tenantIsolation(),
  ],
);

/** FRAUD_RESULTS, technical-specs 06 §6.11 M08: satu hasil per ProcessInstance. */
export const fraudResults = m08Fraud.table(
  "fraud_results",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id),
    processInstanceId: uuid("process_instance_id").notNull(),
    outcome: text("outcome").$type<FraudOutcome>().notNull(),
    isBlacklisted: boolean("is_blacklisted").notNull(),
    ipStatus: text("ip_status").$type<IpCheckStatus>().notNull(),
    ipCategory: text("ip_category"),
    ipAddress: inet("ip_address"),
    ipProviderCode: text("ip_provider_code"),
    velocityHits: jsonb("velocity_hits").$type<VelocityHit[]>().notNull().default([]),
    matrixRowId: uuid("matrix_row_id").references(() => fraudMatrix.id),
    matrixRowPriority: integer("matrix_row_priority"),
    ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex("fraud_results_process_unique").on(table.processInstanceId),
    index("fraud_results_application_idx").on(table.applicationId),
    check("fraud_results_outcome_check", sql`${table.outcome} in (${OUTCOMES})`),
    check("fraud_results_ip_status_check", sql`${table.ipStatus} in (${ipStatusList})`),
    tenantIsolation(),
  ],
);

/** BLACKLISTS, technical-specs 06 §6.11 M08: NIK disimpan terenkripsi dan sebagai blind index untuk pencocokan. */
export const blacklists = m08Fraud.table(
  "blacklists",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    fullName: text("full_name"),
    idCardNumberEnc: bytea("id_card_number_enc"),
    idCardNumberKeyVersion: integer("id_card_number_key_version"),
    idCardNumberBidx: bytea("id_card_number_bidx"),
    ipAddress: inet("ip_address"),
    reason: text("reason").notNull(),
    sourceApplicationId: uuid("source_application_id").references(() => applications.id),
    addedBy: uuid("added_by"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
    ...auditColumns(),
  },
  (table) => [
    index("blacklists_id_card_number_bidx_idx").on(table.tenantId, table.idCardNumberBidx),
    check(
      "blacklists_identity_check",
      sql`${table.idCardNumberBidx} is not null or ${table.ipAddress} is not null or ${table.fullName} is not null`,
    ),
    tenantIsolation(),
  ],
);

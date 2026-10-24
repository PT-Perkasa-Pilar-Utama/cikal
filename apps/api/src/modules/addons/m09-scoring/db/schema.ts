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
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { auditColumns, tenantIsolation } from "../../../../platform/db/columns.js";
import { applications } from "../../../core/application/index.js";
import { products } from "../../../core/product/index.js";
import { companies } from "../../../core/tenancy/index.js";
import type { CriterionType, CriterionValue, Operator } from "../domain/criteria.js";

export const m09Scoring = pgSchema("m09_scoring");

export type ModelGroup = "SCORING" | "RAC";
export type ModelStatus = "DRAFT" | "WAITING_APPROVAL" | "ACTIVE" | "SUPERSEDED";

const tenantId = () =>
  uuid("tenant_id")
    .notNull()
    .references(() => companies.id);
const scoreNumber = (name: string) => numeric(name, { precision: 12, scale: 2 });

/** SCORING_MODELS, technical-specs 06 §6.11 M09: satu baris per versi model (DM-11). */
export const scoringModels = m09Scoring.table(
  "scoring_models",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    modelCode: text("model_code").notNull(),
    modelName: text("model_name").notNull(),
    modelGroup: text("model_group").$type<ModelGroup>().notNull(),
    constant: scoreNumber("constant"),
    cutOff: scoreNumber("cut_off"),
    reviewLowerBound: scoreNumber("review_lower_bound"),
    versionNumber: integer("version_number").notNull(),
    status: text("status").$type<ModelStatus>().notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }),
    ...auditColumns(),
  },
  (table) => [
    unique("scoring_models_version_unique").on(table.tenantId, table.modelCode, table.versionNumber),
    check("scoring_models_model_group_check", sql`${table.modelGroup} in ('SCORING', 'RAC')`),
    check("scoring_models_status_check", sql`${table.status} in ('DRAFT', 'WAITING_APPROVAL', 'ACTIVE', 'SUPERSEDED')`),
    tenantIsolation(),
  ],
);

/** SCORING_CRITERIA, technical-specs 06 §6.11 M09: `field_code` dari katalog variabel (FM-10). */
export const scoringCriteria = m09Scoring.table(
  "scoring_criteria",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    modelId: uuid("model_id")
      .notNull()
      .references(() => scoringModels.id),
    sortOrder: integer("sort_order").notNull(),
    fieldCode: text("field_code").notNull(),
    operator: text("operator").$type<Operator>().notNull(),
    value: jsonb("value").$type<CriterionValue>().notNull(),
    weight: numeric("weight", { precision: 8, scale: 2 }),
    criterionType: text("criterion_type").$type<CriterionType>().notNull(),
    ...auditColumns(),
  },
  (table) => [
    index("scoring_criteria_model_idx").on(table.modelId),
    check(
      "scoring_criteria_operator_check",
      sql`${table.operator} in ('EQ', 'NE', 'GT', 'GE', 'LT', 'LE', 'BETWEEN', 'IN')`,
    ),
    check("scoring_criteria_criterion_type_check", sql`${table.criterionType} in ('WEIGHTED', 'MANDATORY')`),
    check("scoring_criteria_weight_check", sql`${table.weight} between -1000 and 1000`),
    tenantIsolation(),
  ],
);

/** SCORING_MODEL_PRODUCTS, technical-specs 06 §6.11 M09: produk yang memakai versi model. */
export const scoringModelProducts = m09Scoring.table(
  "scoring_model_products",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    modelId: uuid("model_id")
      .notNull()
      .references(() => scoringModels.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex("scoring_model_products_unique").on(table.modelId, table.productId),
    index("scoring_model_products_product_idx").on(table.productId),
    tenantIsolation(),
  ],
);

/** SCORING_RESULTS, technical-specs 06 §6.11 M09: satu hasil RAC dan satu hasil Scoring per ProcessInstance. */
export const scoringResults = m09Scoring.table(
  "scoring_results",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id),
    processInstanceId: uuid("process_instance_id").notNull(),
    modelId: uuid("model_id")
      .notNull()
      .references(() => scoringModels.id),
    modelGroup: text("model_group").$type<ModelGroup>().notNull(),
    totalScore: scoreNumber("total_score"),
    outcome: text("outcome").$type<"PASS" | "REVIEW" | "FAIL">().notNull(),
    failedReasons: jsonb("failed_reasons").$type<string[]>().notNull().default([]),
    ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex("scoring_results_process_group_unique").on(table.processInstanceId, table.modelGroup),
    index("scoring_results_application_idx").on(table.applicationId),
    check("scoring_results_model_group_check", sql`${table.modelGroup} in ('SCORING', 'RAC')`),
    check("scoring_results_outcome_check", sql`${table.outcome} in ('PASS', 'REVIEW', 'FAIL')`),
    tenantIsolation(),
  ],
);

/** SCORING_RESULT_DETAILS, technical-specs 06 §6.11 M09: penilaian tiap kriteria beserta teksnya saat itu. */
export const scoringResultDetails = m09Scoring.table(
  "scoring_result_details",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    scoringResultId: uuid("scoring_result_id")
      .notNull()
      .references(() => scoringResults.id, { onDelete: "cascade" }),
    criterionId: uuid("criterion_id")
      .notNull()
      .references(() => scoringCriteria.id),
    sortOrder: integer("sort_order").notNull(),
    displayText: text("display_text").notNull(),
    actualValue: text("actual_value"),
    isMet: boolean("is_met").notNull(),
    appliedWeight: numeric("applied_weight", { precision: 8, scale: 2 }),
    ...auditColumns(),
  },
  (table) => [index("scoring_result_details_result_idx").on(table.scoringResultId), tenantIsolation()],
);

import type { DecisionOutcome, MatrixCombination } from "@cikal/contracts";
import { sql } from "drizzle-orm";
import { check, integer, pgSchema, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { auditColumns, tenantIsolation } from "../../../../platform/db/columns.js";
import { companies } from "../../../core/tenancy/index.js";

export const m11Decision = pgSchema("m11_decision");

// drizzle-kit memuat file ini sebagai CommonJS, jadi daftar nilai tidak diimpor dari paket kontrak (ESM).
const COLUMN_VALUES = {
  dedup_outcome: ["MATCH", "UNMATCH", "SKIP", "ANY"],
  dukcapil_outcome: ["PASSED", "SKIP", "ANY"],
  fraud_outcome: ["CLEAN", "SUSPICIOUS_CLEARED", "SKIP", "ANY"],
  rac_outcome: ["PASS", "FAIL", "SKIP", "ANY"],
  scoring_outcome: ["PASS", "REVIEW", "FAIL", "SKIP", "ANY"],
  credit_bureau_outcome: ["COLLECT_1", "COLLECT_2", "COLLECT_3", "COLLECT_4", "COLLECT_5", "NO_HISTORY", "SKIP", "ANY"],
  decision_outcome: ["GO", "NOTGO"],
} as const;
const textList = (values: readonly string[]) => sql.raw(values.map((value) => `'${value}'`).join(", "));
const valueCheck = (column: keyof typeof COLUMN_VALUES) =>
  check(`decision_matrix_${column}_check`, sql`${sql.identifier(column)} in (${textList(COLUMN_VALUES[column])})`);

/**
 * DECISION_MATRIX, technical-specs 06 §6.11 M11: baris pertama menurut `priority` yang cocok dipakai, `ANY` cocok
 * untuk semua hasil (AC-36.05). Satu kombinasi enam kolom hanya satu baris per tenant (api-specs 24 §24.2).
 */
export const decisionMatrix = m11Decision.table(
  "decision_matrix",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => companies.id),
    priority: integer("priority").notNull(),
    dedupOutcome: text("dedup_outcome").$type<MatrixCombination["dedupOutcome"]>().notNull(),
    dukcapilOutcome: text("dukcapil_outcome").$type<MatrixCombination["dukcapilOutcome"]>().notNull(),
    fraudOutcome: text("fraud_outcome").$type<MatrixCombination["fraudOutcome"]>().notNull(),
    racOutcome: text("rac_outcome").$type<MatrixCombination["racOutcome"]>().notNull(),
    scoringOutcome: text("scoring_outcome").$type<MatrixCombination["scoringOutcome"]>().notNull(),
    creditBureauOutcome: text("credit_bureau_outcome").$type<MatrixCombination["creditBureauOutcome"]>().notNull(),
    decisionOutcome: text("decision_outcome").$type<DecisionOutcome>().notNull(),
    description: text("description"),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex("decision_matrix_combination_unique").on(
      table.tenantId,
      table.dedupOutcome,
      table.dukcapilOutcome,
      table.fraudOutcome,
      table.racOutcome,
      table.scoringOutcome,
      table.creditBureauOutcome,
    ),
    check("decision_matrix_priority_check", sql`${table.priority} >= 1`),
    valueCheck("dedup_outcome"),
    valueCheck("dukcapil_outcome"),
    valueCheck("fraud_outcome"),
    valueCheck("rac_outcome"),
    valueCheck("scoring_outcome"),
    valueCheck("credit_bureau_outcome"),
    valueCheck("decision_outcome"),
    tenantIsolation(),
  ],
);

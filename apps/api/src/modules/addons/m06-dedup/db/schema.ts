import type { ApplicationStatus, DedupFieldResult, DedupOutcome } from "@cikal/contracts";
import { sql } from "drizzle-orm";
import { check, index, integer, numeric, pgSchema, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { auditColumns, tenantIsolation } from "../../../../platform/db/columns.js";
import { applications } from "../../../core/application/index.js";
import { companies } from "../../../core/tenancy/index.js";
import type { DedupAlgorithm, DedupFieldCode, FuzzyCondition, MatrixCondition } from "../domain/dedup-types.js";

export const m06Dedup = pgSchema("m06_dedup");

// drizzle-kit memuat file ini sebagai CommonJS, jadi daftar nilai tidak diimpor dari paket kontrak (ESM).
const EXACT = ["MATCH", "UNMATCH", "ANY"] as const;
const FUZZY = ["MATCH", "UNMATCH", "FUZZY", "ANY"] as const;
const MATRIX_OUTCOMES = ["MATCH", "UNMATCH", "REVIEW", "SKIP"] as const;
const RESULT_OUTCOMES = ["MATCH", "UNMATCH", "REVIEW", "SKIP", "DUPLICATE_IN_FLIGHT"] as const satisfies DedupOutcome[];
const FIELD_RESULTS = ["MATCH", "UNMATCH"] as const satisfies DedupFieldResult[];
const textList = (values: readonly string[]) => sql.raw(values.map((value) => `'${value}'`).join(", "));
const inList = (column: string, values: readonly string[]) => sql`${sql.identifier(column)} in (${textList(values)})`;

const tenantId = () =>
  uuid("tenant_id")
    .notNull()
    .references(() => companies.id);

/**
 * DEDUP_MATRIX, technical-specs 06 §6.11 M06: baris pertama menurut `priority` yang cocok dengan hasil banding
 * kandidat dipakai, `ANY` cocok untuk semua hasil (AC-59.01).
 */
export const dedupMatrix = m06Dedup.table(
  "dedup_matrix",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    priority: integer("priority").notNull(),
    nik: text("nik").$type<MatrixCondition>().notNull(),
    fullNameId: text("full_name_id").$type<FuzzyCondition>().notNull(),
    dob: text("dob").$type<MatrixCondition>().notNull(),
    pob: text("pob").$type<MatrixCondition>().notNull(),
    motherMaidenName: text("mother_maiden_name").$type<FuzzyCondition>().notNull(),
    dedupOutcome: text("dedup_outcome").$type<"MATCH" | "UNMATCH" | "REVIEW" | "SKIP">().notNull(),
    ...auditColumns(),
  },
  (table) => [
    index("dedup_matrix_priority_idx").on(table.tenantId, table.priority),
    check("dedup_matrix_priority_check", sql`${table.priority} >= 1`),
    check("dedup_matrix_nik_check", inList("nik", EXACT)),
    check("dedup_matrix_dob_check", inList("dob", EXACT)),
    check("dedup_matrix_pob_check", inList("pob", EXACT)),
    check("dedup_matrix_full_name_id_check", inList("full_name_id", FUZZY)),
    check("dedup_matrix_mother_maiden_name_check", inList("mother_maiden_name", FUZZY)),
    check("dedup_matrix_dedup_outcome_check", inList("dedup_outcome", MATRIX_OUTCOMES)),
    tenantIsolation(),
  ],
);

/** DEDUP_FIELD_SETTINGS, technical-specs 06 §6.11 M06: algoritma dan ambang fuzzy 50 s.d. 100 per field nama. */
export const dedupFieldSettings = m06Dedup.table(
  "dedup_field_settings",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    fieldCode: text("field_code").$type<DedupFieldCode>().notNull(),
    algorithm: text("algorithm").$type<DedupAlgorithm>().notNull(),
    fuzzyThreshold: integer("fuzzy_threshold").notNull().default(80),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex("dedup_field_settings_field_unique").on(table.tenantId, table.fieldCode),
    check("dedup_field_settings_field_code_check", inList("field_code", ["FULL_NAME_ID", "MOTHER_MAIDEN_NAME"])),
    check(
      "dedup_field_settings_algorithm_check",
      inList("algorithm", ["LEVENSHTEIN_RATIO", "JARO_WINKLER", "TOKEN_SET_RATIO"]),
    ),
    check("dedup_field_settings_fuzzy_threshold_check", sql`${table.fuzzyThreshold} between 50 and 100`),
    tenantIsolation(),
  ],
);

/**
 * DEDUP_RESULTS, technical-specs 06 §6.11 M06: satu hasil per ProcessInstance. `matrix_row_priority` menyimpan
 * prioritas saat langkah berjalan, karena prioritas baris bisa bergeser oleh perubahan matrix sesudahnya.
 */
export const dedupResults = m06Dedup.table(
  "dedup_results",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id),
    processInstanceId: uuid("process_instance_id").notNull(),
    outcome: text("outcome").$type<DedupOutcome>().notNull(),
    matchedApplicationId: uuid("matched_application_id").references(() => applications.id),
    matrixRowId: uuid("matrix_row_id").references(() => dedupMatrix.id),
    matrixRowPriority: integer("matrix_row_priority"),
    ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex("dedup_results_process_unique").on(table.processInstanceId),
    index("dedup_results_application_idx").on(table.applicationId),
    check("dedup_results_outcome_check", inList("outcome", RESULT_OUTCOMES)),
    tenantIsolation(),
  ],
);

/**
 * DEDUP_CANDIDATES, technical-specs 06 §6.11 M06: pengajuan lain yang dibandingkan. Loan ID dan status disimpan
 * saat langkah berjalan karena tabel `application` bukan milik modul ini (XM-02).
 */
export const dedupCandidates = m06Dedup.table(
  "dedup_candidates",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    dedupResultId: uuid("dedup_result_id")
      .notNull()
      .references(() => dedupResults.id, { onDelete: "cascade" }),
    candidateApplicationId: uuid("candidate_application_id")
      .notNull()
      .references(() => applications.id),
    candidateLoanId: text("candidate_loan_id").notNull(),
    candidateStatus: text("candidate_status").$type<ApplicationStatus>().notNull(),
    nikResult: text("nik_result").$type<DedupFieldResult>().notNull(),
    dobResult: text("dob_result").$type<DedupFieldResult>().notNull(),
    pobResult: text("pob_result").$type<DedupFieldResult>().notNull(),
    nameScore: numeric("name_score", { precision: 5, scale: 4 }).notNull(),
    motherNameScore: numeric("mother_name_score", { precision: 5, scale: 4 }).notNull(),
    ...auditColumns(),
  },
  (table) => [
    index("dedup_candidates_result_idx").on(table.dedupResultId),
    check("dedup_candidates_nik_result_check", inList("nik_result", FIELD_RESULTS)),
    check("dedup_candidates_dob_result_check", inList("dob_result", FIELD_RESULTS)),
    check("dedup_candidates_pob_result_check", inList("pob_result", FIELD_RESULTS)),
    tenantIsolation(),
  ],
);

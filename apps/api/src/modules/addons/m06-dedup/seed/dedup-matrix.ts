import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { seedCompanyIds } from "../../../core/tenancy/index.js";
import { dedupFieldSettings, dedupMatrix } from "../db/schema.js";
import type { DedupAlgorithm, DedupFieldCode, MatrixRow } from "../domain/dedup-types.js";

const row = (priority: number, fields: Omit<MatrixRow, "id" | "priority">): MatrixRow => ({
  id: `0192b6c1-${String(priority).padStart(4, "0")}-7000-8000-000000000001`,
  priority,
  ...fields,
});

/**
 * Baris contoh company 001; id ikut prioritas awal. Baris 1 s.d. 4 mengikuti MRTM US-59 (TRM_DDP_001 s.d. 004);
 * baris 5 dan 6 menangkap sisanya: NIK sama dengan identitas lain berbeda tetap `REVIEW`, NIK beda `UNMATCH`.
 */
export const seedDedupMatrixRows: readonly MatrixRow[] = [
  row(1, {
    nik: "MATCH",
    fullNameId: "MATCH",
    dob: "MATCH",
    pob: "MATCH",
    motherMaidenName: "MATCH",
    dedupOutcome: "MATCH",
  }),
  row(2, {
    nik: "MATCH",
    fullNameId: "FUZZY",
    dob: "MATCH",
    pob: "MATCH",
    motherMaidenName: "FUZZY",
    dedupOutcome: "REVIEW",
  }),
  row(3, {
    nik: "MATCH",
    fullNameId: "UNMATCH",
    dob: "UNMATCH",
    pob: "UNMATCH",
    motherMaidenName: "UNMATCH",
    dedupOutcome: "REVIEW",
  }),
  row(4, {
    nik: "UNMATCH",
    fullNameId: "UNMATCH",
    dob: "ANY",
    pob: "ANY",
    motherMaidenName: "ANY",
    dedupOutcome: "UNMATCH",
  }),
  row(5, {
    nik: "MATCH",
    fullNameId: "ANY",
    dob: "ANY",
    pob: "ANY",
    motherMaidenName: "ANY",
    dedupOutcome: "REVIEW",
  }),
  row(6, {
    nik: "UNMATCH",
    fullNameId: "ANY",
    dob: "ANY",
    pob: "ANY",
    motherMaidenName: "ANY",
    dedupOutcome: "UNMATCH",
  }),
];

const seedFieldSettings: ReadonlyArray<{ fieldCode: DedupFieldCode; algorithm: DedupAlgorithm; id: string }> = [
  { id: "0192b6c2-0001-7000-8000-000000000001", fieldCode: "FULL_NAME_ID", algorithm: "LEVENSHTEIN_RATIO" },
  { id: "0192b6c2-0002-7000-8000-000000000001", fieldCode: "MOTHER_MAIDEN_NAME", algorithm: "LEVENSHTEIN_RATIO" },
];

/** Dedup Matrix dan DedupFieldSetting awal company 001 (seed `dev`); ambang fuzzy bawaan 80. */
export async function seedDedupMatrix(db: NodePgDatabase): Promise<void> {
  await db
    .insert(dedupMatrix)
    .values(seedDedupMatrixRows.map((rule) => ({ ...rule, tenantId: seedCompanyIds.company001 })))
    .onConflictDoNothing();
  await db
    .insert(dedupFieldSettings)
    .values(seedFieldSettings.map((setting) => ({ ...setting, tenantId: seedCompanyIds.company001 })))
    .onConflictDoNothing();
}

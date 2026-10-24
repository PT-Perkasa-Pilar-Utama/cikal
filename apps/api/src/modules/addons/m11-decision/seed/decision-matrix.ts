import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { seedCompanyIds } from "../../../core/tenancy/index.js";
import { decisionMatrix } from "../db/schema.js";
import type { MatrixRule } from "../domain/matrix-rules.js";

const ANY = {
  dedupOutcome: "ANY",
  dukcapilOutcome: "ANY",
  fraudOutcome: "ANY",
  racOutcome: "ANY",
  scoringOutcome: "ANY",
  creditBureauOutcome: "ANY",
} as const;
/** Hasil modul pemohon tanpa temuan (AC-69.01). */
const CLEAN = {
  dedupOutcome: "UNMATCH",
  dukcapilOutcome: "PASSED",
  fraudOutcome: "CLEAN",
  racOutcome: "PASS",
  scoringOutcome: "PASS",
} as const;

const row = (priority: number, fields: Omit<MatrixRule, "id" | "priority" | "description">): MatrixRule => ({
  id: `0192b6ac-${String(priority).padStart(4, "0")}-7000-8000-000000000001`,
  priority,
  description: null,
  ...fields,
});

/** Baris contoh company 001; id ikut prioritas awal. */
export const seedDecisionMatrixRows: readonly MatrixRule[] = [
  row(1, { ...ANY, creditBureauOutcome: "COLLECT_5", decisionOutcome: "NOTGO" }),
  row(2, { ...ANY, racOutcome: "FAIL", decisionOutcome: "NOTGO" }),
  row(3, { ...ANY, scoringOutcome: "FAIL", decisionOutcome: "NOTGO" }),
  row(4, { ...CLEAN, creditBureauOutcome: "COLLECT_1", decisionOutcome: "GO" }),
  row(5, { ...ANY, scoringOutcome: "PASS", creditBureauOutcome: "COLLECT_2", decisionOutcome: "NOTGO" }),
  row(6, { ...CLEAN, creditBureauOutcome: "NO_HISTORY", decisionOutcome: "GO" }),
  row(7, { ...CLEAN, creditBureauOutcome: "SKIP", decisionOutcome: "GO" }),
];

/**
 * Decision Matrix awal company 001 (seed `dev`): NotGo untuk SLIK Collect 5, RAC Fail, Scoring Fail (AC-69.02);
 * Go untuk pemohon tanpa temuan dengan SLIK Collect 1, tanpa riwayat, atau dilewati rute (AC-69.01, AC-69.03); dan
 * NotGo SLIK Collect 2 dengan Scoring Pass yang diubah di AC-36.01. Kombinasi lain NotGo default (AC-36.03).
 */
export async function seedDecisionMatrix(db: NodePgDatabase): Promise<void> {
  await db
    .insert(decisionMatrix)
    .values(seedDecisionMatrixRows.map((rule) => ({ ...rule, tenantId: seedCompanyIds.company001 })))
    .onConflictDoNothing();
}

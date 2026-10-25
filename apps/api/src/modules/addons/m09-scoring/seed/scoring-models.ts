import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { seedCompanyIds } from "../../../core/tenancy/index.js";
import { scoringCriteria, scoringModels } from "../db/schema.js";
import type { Criterion } from "../domain/criteria.js";

/** ID tetap model seed company 001; produk pemakainya ditautkan saat produk dibuat (US-37 backlog). */
export const seedScoringModelIds = {
  ktaRac: "0192b6c5-0001-7000-8000-000000000001",
  ktaScoring: "0192b6c5-0002-7000-8000-000000000001",
} as const;

const criterionId = (n: number) => `0192b6c6-${String(n).padStart(4, "0")}-7000-8000-000000000001`;

/** RAC KTA: rasio angsuran terhadap penghasilan paling tinggi DBR max produk (AC-67.02, AC-67.03). */
const RAC_CRITERIA: readonly Omit<Criterion, "id">[] = [
  {
    fieldCode: "INSTALLMENT_TO_INCOME_RATIO",
    operator: "LE",
    value: { type: "VARIABLE", variableCode: "PRODUCT_DBR_MAX" },
    weight: null,
    criterionType: "MANDATORY",
  },
];

/** Scoring KTA: konstanta 200, Cut Off 430; pemohon yang memenuhi keempat kriteria mendapat 470 (AC-67.01). */
const SCORING_CRITERIA: readonly Omit<Criterion, "id">[] = [
  {
    fieldCode: "OCCUPATION",
    operator: "IN",
    value: { type: "LITERAL", values: ["001", "002"] },
    weight: "100.00",
    criterionType: "WEIGHTED",
  },
  {
    fieldCode: "MONTHLY_INCOME",
    operator: "GE",
    value: { type: "LITERAL", value: "5000000.00" },
    weight: "80.00",
    criterionType: "WEIGHTED",
  },
  {
    fieldCode: "TENURE_AT_CURRENT_JOB",
    operator: "GE",
    value: { type: "LITERAL", value: "2" },
    weight: "50.00",
    criterionType: "WEIGHTED",
  },
  {
    fieldCode: "AGE",
    operator: "BETWEEN",
    value: { type: "LITERAL", from: "25", to: "50" },
    weight: "40.00",
    criterionType: "WEIGHTED",
  },
];

/** Model RAC dan Scoring KTA ACTIVE company 001 (seed `dev`). */
export async function seedScoringModels(db: NodePgDatabase): Promise<void> {
  const tenantId = seedCompanyIds.company001;
  await db
    .insert(scoringModels)
    .values([
      {
        id: seedScoringModelIds.ktaRac,
        tenantId,
        modelCode: "KTA-RAC",
        modelName: "RAC KTA",
        modelGroup: "RAC",
        versionNumber: 1,
        status: "ACTIVE",
      },
      {
        id: seedScoringModelIds.ktaScoring,
        tenantId,
        modelCode: "KTA-2026",
        modelName: "Scoring KTA 2026",
        modelGroup: "SCORING",
        constant: "200.00",
        cutOff: "430.00",
        versionNumber: 1,
        status: "ACTIVE",
      },
    ])
    .onConflictDoNothing();
  const criteria = [
    ...RAC_CRITERIA.map((criterion) => ({ ...criterion, modelId: seedScoringModelIds.ktaRac })),
    ...SCORING_CRITERIA.map((criterion) => ({ ...criterion, modelId: seedScoringModelIds.ktaScoring })),
  ];
  await db
    .insert(scoringCriteria)
    .values(
      criteria.map((criterion, index) => ({
        ...criterion,
        id: criterionId(index + 1),
        tenantId,
        sortOrder: index + 1,
      })),
    )
    .onConflictDoNothing();
}

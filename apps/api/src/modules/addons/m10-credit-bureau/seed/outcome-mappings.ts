import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { seedCompanyIds } from "../../../core/tenancy/index.js";
import { outcomeMappings } from "../db/schema.js";
import type { OutcomeMapping } from "../domain/collectibility.js";

const MAPPINGS: readonly OutcomeMapping[] = [
  { collectibility: 1, quality: "Good", outcome: "COLLECT_1" },
  { collectibility: 2, quality: "Fair", outcome: "COLLECT_2" },
  { collectibility: 3, quality: "Poor", outcome: "COLLECT_3" },
  { collectibility: 4, quality: "Poor", outcome: "COLLECT_4" },
  { collectibility: 5, quality: "Poor", outcome: "COLLECT_5" },
  { collectibility: null, quality: "No history", outcome: "NO_HISTORY" },
];

/** CreditBureauOutcomeMapping company 001 (seed `dev`) sesuai MRTM US-68 (TRM_SLK_001 s.d. 005, RM-16). */
export async function seedOutcomeMappings(db: NodePgDatabase): Promise<void> {
  await db
    .insert(outcomeMappings)
    .values(
      MAPPINGS.map((mapping, index) => ({
        ...mapping,
        id: `0192b6c4-${String(index + 1).padStart(4, "0")}-7000-8000-000000000001`,
        tenantId: seedCompanyIds.company001,
      })),
    )
    .onConflictDoNothing();
}

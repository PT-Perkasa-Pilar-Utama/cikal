import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { seedCompanyIds } from "../../../core/tenancy/index.js";
import { dukcapilRules } from "../db/schema.js";

/** DukcapilRule company 001 (seed `dev`): bobot nama 60%, nama ibu 40%, ambang Passed 0,90, Review 0,75 (AC-61.01). */
export async function seedDukcapilRules(db: NodePgDatabase): Promise<void> {
  await db
    .insert(dukcapilRules)
    .values({
      id: "0192b6c3-0001-7000-8000-000000000001",
      tenantId: seedCompanyIds.company001,
      nameWeight: "60.0000",
      motherNameWeight: "40.0000",
      passedThreshold: "0.9000",
      reviewThreshold: "0.7500",
      notFoundOutcome: "REVIEW",
    })
    .onConflictDoNothing();
}

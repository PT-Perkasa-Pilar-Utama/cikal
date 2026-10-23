import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { seedCompanyIds } from "../../tenancy/index.js";
import { insurances } from "../db/schema.js";

export const seedInsuranceIds = { asuransiContoh: "0192b6a9-0001-7000-8000-000000000001" } as const;

/** Asuransi contoh company 001 untuk seed `dev` dan `qa` (AC-39.01). */
export async function seedInsurances(db: NodePgDatabase): Promise<void> {
  await db
    .insert(insurances)
    .values({
      id: seedInsuranceIds.asuransiContoh,
      tenantId: seedCompanyIds.company001,
      insuranceCode: "ASR01",
      insuranceName: "Asuransi Contoh",
    })
    .onConflictDoNothing();
}

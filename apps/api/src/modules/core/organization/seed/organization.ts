import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { seedCompanyIds } from "../../tenancy/index.js";
import { branches, regionals, subBranches } from "../db/schema.js";

/** ID tetap unit seed company 001; tidak boleh diubah setelah di-merge. */
export const seedOrganizationIds = {
  jawaBarat: "0192b6ae-0001-7000-8000-000000000001",
  bandung: "0192b6ae-0101-7000-8000-000000000001",
  cimahi: "0192b6ae-0102-7000-8000-000000000001",
  dago: "0192b6ae-0201-7000-8000-000000000001",
} as const;

/**
 * Struktur organisasi company 001 (seed `dev`): regional Jawa Barat dengan cabang 011 Bandung (AC-27.01, MRTM
 * TRM_APV_001 s.d. 004) dan 012 Cimahi tanpa setup approval (TRM_APV_005).
 */
export async function seedOrganization(db: NodePgDatabase): Promise<void> {
  const tenantId = seedCompanyIds.company001;
  await db
    .insert(regionals)
    .values({ id: seedOrganizationIds.jawaBarat, tenantId, regionalCode: "01", regionalName: "Jawa Barat" })
    .onConflictDoNothing();
  await db
    .insert(branches)
    .values([
      {
        id: seedOrganizationIds.bandung,
        tenantId,
        regionalId: seedOrganizationIds.jawaBarat,
        branchCode: "011",
        branchName: "Bandung",
      },
      {
        id: seedOrganizationIds.cimahi,
        tenantId,
        regionalId: seedOrganizationIds.jawaBarat,
        branchCode: "012",
        branchName: "Cimahi",
      },
    ])
    .onConflictDoNothing();
  await db
    .insert(subBranches)
    .values({
      id: seedOrganizationIds.dago,
      tenantId,
      branchId: seedOrganizationIds.bandung,
      subBranchCode: "01101",
      subBranchName: "Dago",
    })
    .onConflictDoNothing();
}

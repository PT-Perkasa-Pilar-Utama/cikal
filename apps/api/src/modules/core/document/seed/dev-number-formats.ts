import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { seedCompanyIds } from "../../tenancy/index.js";
import { provisionNumberFormats } from "../application/number-format-provisioning.js";

/** ID tetap format default company 001 seed `dev`. */
export const seedNumberFormatIds = {
  sp3k: "0192b6cc-0001-7000-8000-000000000001",
  contract: "0192b6cc-0002-7000-8000-000000000001",
} as const;

/** Format default DN-10 company 001, berlaku sejak awal POC. */
export async function seedDevNumberFormats(db: NodePgDatabase): Promise<void> {
  await provisionNumberFormats(db, seedCompanyIds.company001, new Date("2026-10-01T00:00:00Z"), (documentType) =>
    documentType === "SP3K" ? seedNumberFormatIds.sp3k : seedNumberFormatIds.contract,
  );
}

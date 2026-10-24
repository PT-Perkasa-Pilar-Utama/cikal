import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { seedCompanyIds } from "../../tenancy/index.js";
import { integrationConfigs } from "../db/schema.js";

/** ID tetap konfigurasi integrasi company 001. */
export const seedIntegrationConfigIds = {
  dukcapil001: "0192b6ab-0007-7000-8000-000000000001",
  ipReputation001: "0192b6ab-0008-7000-8000-000000000001",
  creditBureau001: "0192b6ab-0010-7000-8000-000000000001",
} as const;

const SEEDED_FROM = new Date("2026-01-01T00:00:00Z");
/** Batas waktu dan retry default COM-04, ER-03 (technical-specs 13 §13.5). */
const TIMEOUT_SECONDS = 30;
const MAX_RETRIES = 3;

const simulation = (id: string, moduleCode: "M07" | "M08" | "M10") => ({
  id,
  tenantId: seedCompanyIds.company001,
  moduleCode,
  providerCode: `SIMULATION_${moduleCode}`,
  mode: "SYNC" as const,
  timeoutSeconds: TIMEOUT_SECONDS,
  maxRetries: MAX_RETRIES,
  versionNumber: 1,
  status: "ACTIVE" as const,
  effectiveFrom: SEEDED_FROM,
});

/**
 * Konfigurasi ACTIVE adapter simulasi Dukcapil, reputasi IP, dan SLIK untuk company 001 (TASK_BREAKDOWN: integrasi
 * memakai adapter simulasi, konfigurasi integrasi lewat seed). Hanya seed `dev` dan `qa`, karena adapter simulasi
 * ditolak di production (IN-03).
 */
export async function seedIntegrationConfigs(db: NodePgDatabase): Promise<void> {
  await db
    .insert(integrationConfigs)
    .values([
      simulation(seedIntegrationConfigIds.dukcapil001, "M07"),
      simulation(seedIntegrationConfigIds.ipReputation001, "M08"),
      simulation(seedIntegrationConfigIds.creditBureau001, "M10"),
    ])
    .onConflictDoNothing();
}

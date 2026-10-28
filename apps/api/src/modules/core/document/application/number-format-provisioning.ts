import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { v7 as uuidv7 } from "uuid";
import { documentNumberFormats } from "../db/schema.js";
import { DEFAULT_NUMBER_FORMATS } from "../domain/default-number-formats.js";

/** ID baris format default; seed memakai ID tetap, company baru memakai UUID v7. */
export type FormatIds = (documentType: (typeof DEFAULT_NUMBER_FORMATS)[number]["documentType"]) => string;

/**
 * Format default saat aktivasi tenant (grooming v3 DN-10) sebagai versi 1 ACTIVE, ditulis role pemilik skema di luar
 * sesi (seed dan `create-admin`, DEPLOYMENT_PLAN §3.6). Jenis dokumen yang sudah punya versi tidak berubah.
 */
export async function provisionNumberFormats(
  db: NodePgDatabase,
  tenantId: string,
  effectiveFrom: Date,
  ids: FormatIds = () => uuidv7(),
): Promise<void> {
  await db
    .insert(documentNumberFormats)
    .values(
      DEFAULT_NUMBER_FORMATS.map((format) => ({
        ...format,
        id: ids(format.documentType),
        tenantId,
        versionNumber: 1,
        status: "ACTIVE" as const,
        effectiveFrom,
      })),
    )
    .onConflictDoNothing();
}

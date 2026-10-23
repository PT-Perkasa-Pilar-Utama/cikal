import { licenseFileSchema } from "@cikal/contracts";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { licenses, moduleEntitlements } from "../db/schema.js";
import { seedCompanyIds } from "./companies.js";
import { devLicenseFile } from "./dev-license.js";

const pad = (n: number) => String(n).padStart(12, "0");
const DEV_LICENSE_ID = `0192b6ab-0001-7000-8000-${pad(1)}`;
const entitlementId = (n: number) => `0192b6ac-0001-7000-8000-${pad(n)}`;

/** Lisensi aktif company 001 untuk seed `dev` dan `qa` (TL-S2-02); aplikasi memverifikasi tanda tangannya saat dimuat. */
export async function seedLicenses(db: NodePgDatabase): Promise<void> {
  const { license, signature } = licenseFileSchema.parse(devLicenseFile);
  await db
    .insert(licenses)
    .values({
      id: DEV_LICENSE_ID,
      tenantId: seedCompanyIds.company001,
      licenseNumber: license.licenseNumber,
      deploymentType: license.deploymentType,
      validFrom: license.validFrom,
      validTo: license.validTo,
      maxUsers: license.maxUsers,
      signature: Buffer.from(signature, "base64"),
      rawDocument: devLicenseFile,
      status: "ACTIVE",
    })
    .onConflictDoNothing();
  await db
    .insert(moduleEntitlements)
    .values(
      license.modules.map((moduleCode, index) => ({
        id: entitlementId(index + 1),
        tenantId: seedCompanyIds.company001,
        licenseId: DEV_LICENSE_ID,
        moduleCode,
      })),
    )
    .onConflictDoNothing();
}

import type { LicenseFile } from "@cikal/contracts";
import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { v7 as uuidv7 } from "uuid";
import { companies, licenses, moduleEntitlements } from "./schema.js";

export interface NewCompany {
  id: string;
  companyCode: string;
  companyName: string;
  address: string;
}

/**
 * Penulisan provisioning tenant oleh role pemilik skema di luar sesi: `create-admin` dan pemasangan `LICENSE_FILE`
 * setelah reset (DEPLOYMENT_PLAN §3.6, F-09). Role pemilik skema melewati RLS, jadi setiap query menyebut tenant-nya.
 */
export const tenantProvisioning = {
  async companyId(db: NodePgDatabase, companyCode: string): Promise<string | null> {
    const [row] = await db.select({ id: companies.id }).from(companies).where(eq(companies.companyCode, companyCode));
    return row?.id ?? null;
  },

  async insertCompany(db: NodePgDatabase, company: NewCompany): Promise<void> {
    await db.insert(companies).values(company);
  },

  async licenseStatus(db: NodePgDatabase, tenantId: string, licenseNumber: string): Promise<string | null> {
    const [row] = await db
      .select({ status: licenses.status })
      .from(licenses)
      .where(and(eq(licenses.tenantId, tenantId), eq(licenses.licenseNumber, licenseNumber)));
    return row?.status ?? null;
  },

  /** Lisensi aktif tenant menjadi `REVOKED`, lalu file terverifikasi menjadi lisensi `ACTIVE` beserta modulnya. */
  async replaceActiveLicense(db: NodePgDatabase, tenantId: string, document: LicenseFile): Promise<void> {
    const { license } = document;
    await db
      .update(licenses)
      .set({ status: "REVOKED", updatedAt: new Date() })
      .where(and(eq(licenses.tenantId, tenantId), eq(licenses.status, "ACTIVE")));
    const licenseId = uuidv7();
    await db.insert(licenses).values({
      id: licenseId,
      tenantId,
      licenseNumber: license.licenseNumber,
      deploymentType: license.deploymentType,
      validFrom: license.validFrom,
      validTo: license.validTo,
      maxUsers: license.maxUsers,
      signature: Buffer.from(document.signature, "base64"),
      rawDocument: document,
      status: "ACTIVE",
    });
    await db
      .insert(moduleEntitlements)
      .values(license.modules.map((moduleCode) => ({ id: uuidv7(), tenantId, licenseId, moduleCode })));
  },
};

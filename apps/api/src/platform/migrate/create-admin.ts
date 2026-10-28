import type { LicenseFile } from "@cikal/contracts";
import { sql } from "drizzle-orm";
import type pg from "pg";
import { provisionAdministrator } from "../../modules/core/identity/index.js";
import { installLicenseFile, provisionCompany } from "../../modules/core/tenancy/index.js";
import { businessDate } from "../clock/business-date.js";
import { provisionTenantKeys } from "../crypto/provision-tenant-keys.js";
import { OPS_CHANNEL } from "./runner.js";
import { inTransaction } from "./transaction.js";

export interface CreateAdminRequest {
  license: LicenseFile;
  masterKey: Buffer;
  username: string;
  fullName: string;
  email: string;
  /** Wajib bila company lisensi belum ada di database. */
  companyName: string | null;
  address: string | null;
}

export interface CreatedAdmin {
  companyCode: string;
  username: string;
  oneTimePassword: string;
  licenseInstalled: boolean;
}

/**
 * Subperintah `create-admin` (DEPLOYMENT_PLAN §3.6 langkah 5): company dari `LICENSE_FILE`, kunci tenant, lisensi,
 * role standar, dan admin pertama ber-role Super User dalam satu transaksi. Lisensi pertama terpasang tanpa halaman
 * License; api yang sudah berjalan membuang cache lisensinya lewat `license_installed`.
 */
export async function createAdmin(pool: pg.Pool, request: CreateAdminRequest): Promise<CreatedAdmin> {
  const { companyCode } = request.license.license;
  return inTransaction(pool, async (db) => {
    const tenantId = await provisionCompany(db, {
      companyCode,
      companyName: request.companyName,
      address: request.address,
    });
    await provisionTenantKeys(db, request.masterKey, tenantId);
    const { installed } = await installLicenseFile(db, request.license, businessDate(new Date()));
    const admin = await provisionAdministrator(db, {
      tenantId,
      username: request.username,
      fullName: request.fullName,
      email: request.email,
    });
    if (installed) await db.execute(sql`select pg_notify(${OPS_CHANNEL}, 'license_installed')`);
    return { companyCode, ...admin, licenseInstalled: installed };
  });
}

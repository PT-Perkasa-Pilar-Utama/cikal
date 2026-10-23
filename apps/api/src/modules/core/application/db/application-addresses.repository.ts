import { Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { applicationAddresses } from "./schema.js";
import type { SectionOwner } from "./section-owner.js";

export type ApplicationAddressRow = typeof applicationAddresses.$inferSelect;
/** Field satu alamat; kunci tabel dan kolom audit diisi repository. */
export type ApplicationAddressFields = Omit<
  typeof applicationAddresses.$inferInsert,
  "id" | "applicationId" | "tenantId" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy"
>;

/** Akses tabel `application.application_addresses` (technical-specs 06 §6.9). */
@Injectable()
export class ApplicationAddressesRepository {
  /** Satu baris per jenis alamat; simpan ulang mengganti seluruh field alamat. */
  async upsert(
    tx: Tx,
    owner: SectionOwner,
    addresses: readonly (ApplicationAddressFields & { id: string })[],
    userId: string,
  ): Promise<void> {
    if (addresses.length === 0) return;
    await tx
      .insert(applicationAddresses)
      .values(addresses.map((address) => ({ ...owner, ...address, createdBy: userId, updatedBy: userId })))
      .onConflictDoUpdate({
        target: [applicationAddresses.applicationId, applicationAddresses.addressType],
        set: {
          address: sql`excluded.address`,
          rt: sql`excluded.rt`,
          rw: sql`excluded.rw`,
          provinceCode: sql`excluded.province_code`,
          cityCode: sql`excluded.city_code`,
          districtCode: sql`excluded.district_code`,
          subDistrictCode: sql`excluded.sub_district_code`,
          zipCode: sql`excluded.zip_code`,
          sameAsId: sql`excluded.same_as_id`,
          updatedAt: sql`now()`,
          updatedBy: userId,
        },
      });
  }

  async listByApplication(tx: Tx, applicationId: string): Promise<ApplicationAddressRow[]> {
    return tx.select().from(applicationAddresses).where(eq(applicationAddresses.applicationId, applicationId));
  }
}

import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { licenses } from "./schema.js";

export interface StoredLicense {
  licenseNumber: string;
  /** Isi file lisensi asli; belum dipercaya sebelum tanda tangannya diverifikasi. */
  rawDocument: unknown;
  createdAt: Date;
}

export type NewLicense = Omit<typeof licenses.$inferInsert, "status" | "createdAt" | "updatedAt">;

/** Akses tabel `tenancy.licenses` untuk tenant transaksi (technical-specs 06 §6.5). */
@Injectable()
export class LicensesRepository {
  async findActive(tx: Tx): Promise<StoredLicense | null> {
    const [row] = await tx
      .select({
        licenseNumber: licenses.licenseNumber,
        rawDocument: licenses.rawDocument,
        createdAt: licenses.createdAt,
      })
      .from(licenses)
      .where(eq(licenses.status, "ACTIVE"));
    return row ?? null;
  }

  async exists(tx: Tx, licenseNumber: string): Promise<boolean> {
    const [row] = await tx.select({ id: licenses.id }).from(licenses).where(eq(licenses.licenseNumber, licenseNumber));
    return row !== undefined;
  }

  /** ACTIVE -> REVOKED untuk lisensi yang digantikan (technical-specs 07 §7.6). */
  async revokeActive(tx: Tx, userId: string): Promise<void> {
    await tx
      .update(licenses)
      .set({ status: "REVOKED", updatedAt: new Date(), updatedBy: userId })
      .where(eq(licenses.status, "ACTIVE"));
  }

  async insertActive(tx: Tx, license: NewLicense): Promise<void> {
    await tx.insert(licenses).values({ ...license, status: "ACTIVE" });
  }
}

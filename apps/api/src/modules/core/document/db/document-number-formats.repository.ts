import type { DocumentType, NumberFormatStatus } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { documentNumberFormats } from "./schema.js";

const formatColumns = {
  id: documentNumberFormats.id,
  documentType: documentNumberFormats.documentType,
  pattern: documentNumberFormats.pattern,
  resetPeriod: documentNumberFormats.resetPeriod,
  counterScope: documentNumberFormats.counterScope,
  versionNumber: documentNumberFormats.versionNumber,
  status: documentNumberFormats.status,
  effectiveFrom: documentNumberFormats.effectiveFrom,
};

export type NumberFormatRow = Pick<typeof documentNumberFormats.$inferSelect, keyof typeof formatColumns>;
export type NewNumberFormat = Omit<NumberFormatRow, "status">;

/** Penulis perubahan format; `userId` kosong untuk job aktivasi. */
export interface FormatWriter {
  tenantId: string;
  userId: string | null;
}

/** Akses tabel `document.document_number_formats` (technical-specs 06 §6.8). */
@Injectable()
export class DocumentNumberFormatsRepository {
  /**
   * Mengunci jenis dokumen sampai transaksi selesai, sehingga dua pengajuan bersamaan tidak sama-sama membuat versi
   * `WAITING_APPROVAL` dan aktivasi tidak bertabrakan (AC-12.06).
   */
  async lockType(tx: Tx, tenantId: string, documentType: DocumentType): Promise<void> {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`document_number_format:${tenantId}:${documentType}`}, 0))`,
    );
  }

  /** Versi satu jenis dokumen, terbaru dulu. */
  listVersions(tx: Tx, documentType: DocumentType): Promise<NumberFormatRow[]> {
    return tx
      .select(formatColumns)
      .from(documentNumberFormats)
      .where(eq(documentNumberFormats.documentType, documentType))
      .orderBy(desc(documentNumberFormats.versionNumber));
  }

  /** Versi ACTIVE dan WAITING_APPROVAL semua jenis dokumen, untuk halaman daftar (api-specs 10 §10.3). */
  listCurrent(tx: Tx): Promise<NumberFormatRow[]> {
    return tx
      .select(formatColumns)
      .from(documentNumberFormats)
      .where(sql`${documentNumberFormats.status} in ('ACTIVE', 'WAITING_APPROVAL')`)
      .orderBy(documentNumberFormats.documentType);
  }

  async findActive(tx: Tx, documentType: DocumentType): Promise<NumberFormatRow | null> {
    const [row] = await tx
      .select(formatColumns)
      .from(documentNumberFormats)
      .where(and(eq(documentNumberFormats.documentType, documentType), eq(documentNumberFormats.status, "ACTIVE")));
    return row ?? null;
  }

  async findById(tx: Tx, id: string): Promise<NumberFormatRow | null> {
    const [row] = await tx.select(formatColumns).from(documentNumberFormats).where(eq(documentNumberFormats.id, id));
    return row ?? null;
  }

  async insert(tx: Tx, format: NewNumberFormat, status: NumberFormatStatus, writer: FormatWriter): Promise<void> {
    await tx.insert(documentNumberFormats).values({
      ...format,
      status,
      tenantId: writer.tenantId,
      createdBy: writer.userId,
      updatedBy: writer.userId,
    });
  }

  async setStatus(
    tx: Tx,
    id: string,
    change: { status: NumberFormatStatus; effectiveFrom?: Date | null },
    userId: string | null,
  ): Promise<void> {
    await tx
      .update(documentNumberFormats)
      .set({ ...change, updatedAt: new Date(), updatedBy: userId })
      .where(eq(documentNumberFormats.id, id));
  }

  async supersedeActive(tx: Tx, documentType: DocumentType, userId: string | null): Promise<void> {
    await tx
      .update(documentNumberFormats)
      .set({ status: "SUPERSEDED", updatedAt: new Date(), updatedBy: userId })
      .where(and(eq(documentNumberFormats.documentType, documentType), eq(documentNumberFormats.status, "ACTIVE")));
  }
}

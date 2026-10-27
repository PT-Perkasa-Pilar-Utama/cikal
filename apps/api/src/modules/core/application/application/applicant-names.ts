import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { ApplicantLookupRepository } from "../db/applicant-lookup.repository.js";

/**
 * Nama lengkap pemohon dari section Personal untuk daftar modul lain, contoh antrean tugas (api-specs 14 §14.2): modul
 * lain tidak membaca tabel `application` sendiri (XM-02).
 */
@Injectable()
export class ApplicantNames {
  constructor(private readonly lookup: ApplicantLookupRepository) {}

  /** Nama per id pengajuan; pengajuan tanpa section Personal tidak ada di hasil. */
  async namesOf(tx: Tx, applicationIds: readonly string[]): Promise<Map<string, string>> {
    const rows = await this.lookup.findFullNames(tx, [...new Set(applicationIds)]);
    return new Map(rows.map((row) => [row.applicationId, row.fullName]));
  }

  /** Id pengajuan yang nama pemohonnya memuat `text`; `%` dan `_` dibaca harfiah. */
  matching(tx: Tx, text: string): Promise<string[]> {
    return this.lookup.findIdsByFullName(tx, text);
  }
}

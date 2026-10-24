import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { ApplicationFactsRepository, type ApplicationFactsRow } from "../db/application-facts.repository.js";

export type ApplicationFacts = ApplicationFactsRow;

/**
 * Data pengajuan, pemohon, dan pekerjaan untuk modul langkah, contoh RAC, Scoring, dan Credit Bureau
 * (technical-specs 05 §5.18): modul langkah tidak membaca tabel `application` sendiri (XM-02).
 */
@Injectable()
export class ApplicationFactsReader {
  constructor(private readonly facts: ApplicationFactsRepository) {}

  /** `null` bila pengajuan tidak ada di tenant transaksi. */
  of(tx: Tx, applicationId: string): Promise<ApplicationFacts | null> {
    return this.facts.find(tx, applicationId);
  }
}

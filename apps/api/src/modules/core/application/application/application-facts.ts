import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import {
  ApplicationFactsRepository,
  type ApplicationFactsRow,
  type SubmissionKey,
} from "../db/application-facts.repository.js";

export type ApplicationFacts = ApplicationFactsRow;
export type { SubmissionKey };

/**
 * Data pengajuan, pemohon, dan pekerjaan untuk modul langkah, contoh RAC, Scoring, Credit Bureau, dan Fraud
 * (technical-specs 05 §5.18): modul langkah tidak membaca tabel `application` sendiri (XM-02).
 */
@Injectable()
export class ApplicationFactsReader {
  constructor(private readonly facts: ApplicationFactsRepository) {}

  /** `null` bila pengajuan tidak ada di tenant transaksi. */
  of(tx: Tx, applicationId: string): Promise<ApplicationFacts | null> {
    return this.facts.find(tx, applicationId);
  }

  /** Frekuensi pengajuan untuk FraudVelocityRule: pengajuan non-draft yang disubmit sejak `since`. */
  countSubmitted(tx: Tx, key: SubmissionKey, since: Date): Promise<number> {
    return this.facts.countSubmitted(tx, key, since);
  }
}

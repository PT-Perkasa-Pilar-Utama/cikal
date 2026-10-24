import type { ApplicationStatus } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantEncryption } from "../../../../platform/crypto/tenant-encryption.js";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { type ApplicantIdentityRow, ApplicantLookupRepository } from "../db/applicant-lookup.repository.js";

/** Identitas pemohon yang dibaca modul langkah; NIK dan nama ibu sudah didekripsi. */
export interface ApplicantIdentity {
  applicationId: string;
  loanId: string;
  status: ApplicationStatus;
  nik: string;
  nikBlindIndex: Buffer;
  fullNameId: string;
  placeOfBirth: string | null;
  dateOfBirth: string | null;
  motherMaidenName: string | null;
}

/** Pengajuan lain yang mirip dengan pemohon; `sameNik` dari blind index, NIK kandidat tidak didekripsi. */
export type DedupCandidate = Omit<ApplicantIdentity, "nik" | "nikBlindIndex"> & { sameNik: boolean };

/**
 * Identitas pemohon untuk modul langkah, contoh Dedup (technical-specs 05 §5.18): modul langkah tidak membaca tabel
 * `application` sendiri (XM-02), dan hanya Application yang memegang kunci dekripsi kolomnya (DM-08).
 */
@Injectable()
export class ApplicationIdentities {
  constructor(
    private readonly lookup: ApplicantLookupRepository,
    private readonly encryption: TenantEncryption,
  ) {}

  /** `null` bila pengajuan belum punya section Personal atau bukan milik tenant transaksi. */
  async identityOf(tx: Tx, applicationId: string): Promise<ApplicantIdentity | null> {
    const row = await this.lookup.findIdentity(tx, applicationId);
    if (!row) return null;
    const nik = await this.encryption.decrypt(tx, {
      ciphertext: row.idCardNumberEnc,
      keyVersion: row.idCardNumberKeyVersion,
    });
    return { ...(await this.withoutNik(tx, row)), nik, nikBlindIndex: row.idCardNumberBidx };
  }

  /** Pengajuan lain yang sudah disubmit dengan NIK atau tanggal lahir yang sama dengan `subject`. */
  async dedupCandidates(tx: Tx, subject: ApplicantIdentity): Promise<DedupCandidate[]> {
    const rows = await this.lookup.findDedupCandidates(tx, subject);
    return Promise.all(
      rows.map(async (row) => ({
        ...(await this.withoutNik(tx, row)),
        sameNik: row.idCardNumberBidx.equals(subject.nikBlindIndex),
      })),
    );
  }

  private async withoutNik(tx: Tx, row: ApplicantIdentityRow): Promise<Omit<DedupCandidate, "sameNik">> {
    const { motherMaidenNameEnc, motherMaidenNameKeyVersion } = row;
    return {
      applicationId: row.applicationId,
      loanId: row.loanId,
      status: row.status,
      fullNameId: row.fullNameId,
      placeOfBirth: row.placeOfBirth,
      dateOfBirth: row.dateOfBirth,
      motherMaidenName:
        motherMaidenNameEnc && motherMaidenNameKeyVersion !== null
          ? await this.encryption.decrypt(tx, {
              ciphertext: motherMaidenNameEnc,
              keyVersion: motherMaidenNameKeyVersion,
            })
          : null,
    };
  }
}

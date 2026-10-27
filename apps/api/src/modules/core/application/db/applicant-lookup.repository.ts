import type { ApplicationStatus } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, eq, ilike, inArray, ne, or, type SQL } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { applicationPersonals, applications } from "./schema.js";

/** Kolom identitas yang dibaca modul langkah; field terenkripsi masih berupa ciphertext. */
export interface ApplicantIdentityRow {
  applicationId: string;
  loanId: string;
  status: ApplicationStatus;
  fullNameId: string;
  placeOfBirth: string | null;
  dateOfBirth: string | null;
  idCardNumberEnc: Buffer;
  idCardNumberKeyVersion: number;
  idCardNumberBidx: Buffer;
  motherMaidenNameEnc: Buffer | null;
  motherMaidenNameKeyVersion: number | null;
}

const identityColumns = {
  applicationId: applicationPersonals.applicationId,
  loanId: applications.loanId,
  status: applications.status,
  fullNameId: applicationPersonals.fullNameId,
  placeOfBirth: applicationPersonals.placeOfBirth,
  dateOfBirth: applicationPersonals.dateOfBirth,
  idCardNumberEnc: applicationPersonals.idCardNumberEnc,
  idCardNumberKeyVersion: applicationPersonals.idCardNumberKeyVersion,
  idCardNumberBidx: applicationPersonals.idCardNumberBidx,
  motherMaidenNameEnc: applicationPersonals.motherMaidenNameEnc,
  motherMaidenNameKeyVersion: applicationPersonals.motherMaidenNameKeyVersion,
};

export interface ApplicantNameRow {
  applicationId: string;
  fullName: string;
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

/** Bacaan identitas pemohon `application.application_personals` untuk modul langkah (technical-specs 05 §5.10). */
@Injectable()
export class ApplicantLookupRepository {
  async findIdentity(tx: Tx, applicationId: string): Promise<ApplicantIdentityRow | null> {
    const [row] = await tx
      .select(identityColumns)
      .from(applicationPersonals)
      .innerJoin(applications, eq(applications.id, applicationPersonals.applicationId))
      .where(eq(applicationPersonals.applicationId, applicationId));
    return row ?? null;
  }

  /** Pengajuan lain yang sudah disubmit dengan NIK sama (blind index) atau tanggal lahir sama; draft tidak ikut. */
  async findDedupCandidates(
    tx: Tx,
    subject: { applicationId: string; nikBlindIndex: Buffer; dateOfBirth: string | null },
  ): Promise<ApplicantIdentityRow[]> {
    const sameNik = eq(applicationPersonals.idCardNumberBidx, subject.nikBlindIndex);
    const similar: SQL | undefined =
      subject.dateOfBirth === null ? sameNik : or(sameNik, eq(applicationPersonals.dateOfBirth, subject.dateOfBirth));
    return tx
      .select(identityColumns)
      .from(applicationPersonals)
      .innerJoin(applications, eq(applications.id, applicationPersonals.applicationId))
      .where(
        and(ne(applicationPersonals.applicationId, subject.applicationId), ne(applications.status, "DRAFT"), similar),
      )
      .orderBy(applications.createdAt, applications.id);
  }

  async findFullNames(tx: Tx, applicationIds: readonly string[]): Promise<ApplicantNameRow[]> {
    if (applicationIds.length === 0) return [];
    return tx
      .select({ applicationId: applicationPersonals.applicationId, fullName: applicationPersonals.fullName })
      .from(applicationPersonals)
      .where(inArray(applicationPersonals.applicationId, [...applicationIds]));
  }

  /** Pengajuan yang nama lengkap pemohonnya memuat `text`, tanpa membedakan huruf besar dan kecil. */
  async findIdsByFullName(tx: Tx, text: string): Promise<string[]> {
    const rows = await tx
      .select({ applicationId: applicationPersonals.applicationId })
      .from(applicationPersonals)
      .where(ilike(applicationPersonals.fullName, `%${escapeLike(text)}%`));
    return rows.map((row) => row.applicationId);
  }
}

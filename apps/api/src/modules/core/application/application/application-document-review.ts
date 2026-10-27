import { Inject, Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { GENERAL_PARAMETER_PORT, type GeneralParameterPort } from "../../../../platform/http/general-parameter-port.js";
import { ApplicationDocumentsRepository } from "../db/application-documents.repository.js";
import { ApplicationPersonalsRepository } from "../db/application-personals.repository.js";
import { ApplicationsRepository } from "../db/applications.repository.js";
import type { DocumentVerificationStatus } from "../db/schema.js";
import { ApplicationIdentities } from "./application-identities.js";
import { DraftDocuments } from "./draft-documents.js";

/** Dokumen terunggah beserta status verifikasinya (technical-specs 06 §6.9 APPLICATION_DOCUMENTS). */
export interface ReviewDocument {
  documentType: string;
  label: string;
  isMandatory: boolean;
  fileId: string;
  verificationStatus: DocumentVerificationStatus;
  remarks: string | null;
}

export interface DocumentReview {
  documentType: string;
  verificationStatus: DocumentVerificationStatus;
  remarks: string | null;
}

export interface ApplicantSummary {
  fullName: string | null;
  idCardNumber: string | null;
  dateOfBirth: string | null;
}

/**
 * Dokumen pengajuan untuk modul Verification (technical-specs 05 §5.13): Verification tidak membaca tabel
 * `application` sendiri (XM-02), dan hanya Application yang memegang kunci dekripsi NIK (DM-08).
 */
@Injectable()
export class ApplicationDocumentReview {
  constructor(
    private readonly applications: ApplicationsRepository,
    private readonly documents: ApplicationDocumentsRepository,
    private readonly personals: ApplicationPersonalsRepository,
    private readonly drafts: DraftDocuments,
    private readonly identities: ApplicationIdentities,
    @Inject(GENERAL_PARAMETER_PORT) private readonly parameters: GeneralParameterPort,
  ) {}

  /** Dokumen terunggah urut checklist; label dari General Parameter "Document", wajib dari item checklist. */
  async documentsOf(tx: Tx, applicationId: string): Promise<ReviewDocument[]> {
    const application = await this.applications.findById(tx, applicationId);
    if (!application) return [];
    const items = (await this.drafts.matchingItems(tx, application)) ?? [];
    const uploaded = await this.documents.listByApplication(tx, applicationId);
    const options = await this.parameters.options(tx, "Document", { includeInactive: true });
    const labels = new Map(options.map((option) => [option.paramId, option.paramValue]));
    const order = (documentType: string) => {
      const index = items.findIndex((item) => item.documentType === documentType);
      return index === -1 ? items.length : index;
    };
    return uploaded
      .flatMap((row) => (row.fileId ? [{ ...row, fileId: row.fileId }] : []))
      .sort((a, b) => order(a.documentType) - order(b.documentType))
      .map((row) => ({
        documentType: row.documentType,
        label: labels.get(row.documentType) ?? row.documentType,
        isMandatory: items.find((item) => item.documentType === row.documentType)?.isMandatory ?? false,
        fileId: row.fileId,
        verificationStatus: row.verificationStatus,
        remarks: row.verificationRemarks,
      }));
  }

  /** Status dan remarks per dokumen (api-specs 15 §15.2); dokumen yang tidak diunggah tidak berubah. */
  async save(tx: Tx, applicationId: string, reviews: readonly DocumentReview[], userId: string): Promise<void> {
    for (const review of reviews) await this.documents.setVerification(tx, applicationId, review, userId);
  }

  /** Pengajuan pemilik file dokumen, untuk hak pratinjau Verifikator (api-specs 10 §10.1, AC-64.05). */
  applicationOfFile(tx: Tx, fileId: string): Promise<string | null> {
    return this.documents.applicationOfFile(tx, fileId);
  }

  /** Ringkasan pemohon di layar verifikasi dengan NIK terdekripsi (api-specs 15 §15.1). */
  async applicantOf(tx: Tx, applicationId: string): Promise<ApplicantSummary> {
    const personal = await this.personals.findByApplication(tx, applicationId);
    const identity = await this.identities.identityOf(tx, applicationId);
    return {
      fullName: personal?.fullName ?? null,
      idCardNumber: identity?.nik ?? null,
      dateOfBirth: personal?.dateOfBirth ?? null,
    };
  }
}

import type { ApplicationStatus, FormSection, ProductCategory, StepCode } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { applications } from "./schema.js";

export interface ApplicationProcessRow {
  id: string;
  tenantId: string;
  loanId: string;
  productId: string;
  productCategory: ProductCategory;
  /** Cabang pembuat draft; kosong bila pembuatnya role pusat. */
  branchId: string | null;
  status: ApplicationStatus;
  currentStep: StepCode | null;
  createdAt: Date;
  submittedAt: Date | null;
  submittedBy: string | null;
}

const processColumns = {
  id: applications.id,
  tenantId: applications.tenantId,
  loanId: applications.loanId,
  productId: applications.productId,
  productCategory: applications.productCategory,
  branchId: applications.branchId,
  status: applications.status,
  currentStep: applications.currentStep,
  createdAt: applications.createdAt,
  submittedAt: applications.submittedAt,
  submittedBy: applications.submittedBy,
};

export interface DraftRow {
  id: string;
  loanId: string;
  status: ApplicationStatus;
  productCategory: ProductCategory;
  productId: string;
  applicationType: string | null;
  segment: string | null;
  purposeOfLoan: string | null;
  tenorProposed: number | null;
  requestedLimit: string | null;
  insuranceId: string | null;
  sourceCode: string | null;
  salesCode: string | null;
  referralCode: string | null;
  marketingCode: string | null;
  consentAt: Date | null;
  currentSection: FormSection;
  returnNote: string | null;
}

/** Pengajuan untuk "Application Detail" (api-specs 12 §12.9): section Application, ringkasan, dan lingkup data. */
export interface DetailRow extends DraftRow {
  createdBy: string | null;
  branchId: string | null;
  currentStep: StepCode | null;
  tenorApproved: number | null;
  loanAmount: string | null;
  submittedAt: Date | null;
}

/** Pengajuan dicari dari id atau Loan ID (api-specs 12 §12.9, §12.10). */
export type ApplicationKey = { id: string } | { loanId: string };

/** Kolom section Application, persetujuan pemohon, dan posisi form yang diubah simpan section. */
export type DraftChanges = Partial<
  Pick<
    typeof applications.$inferInsert,
    | "productCategory"
    | "productId"
    | "applicationType"
    | "segment"
    | "purposeOfLoan"
    | "tenorProposed"
    | "requestedLimit"
    | "insuranceId"
    | "sourceCode"
    | "salesCode"
    | "referralCode"
    | "marketingCode"
    | "consentAt"
    | "consentChannel"
    | "currentSection"
  >
>;

const draftColumns = {
  id: applications.id,
  loanId: applications.loanId,
  status: applications.status,
  productCategory: applications.productCategory,
  productId: applications.productId,
  applicationType: applications.applicationType,
  segment: applications.segment,
  purposeOfLoan: applications.purposeOfLoan,
  tenorProposed: applications.tenorProposed,
  requestedLimit: applications.requestedLimit,
  insuranceId: applications.insuranceId,
  sourceCode: applications.sourceCode,
  salesCode: applications.salesCode,
  referralCode: applications.referralCode,
  marketingCode: applications.marketingCode,
  consentAt: applications.consentAt,
  currentSection: applications.currentSection,
  returnNote: applications.returnNote,
};

const detailColumns = {
  ...draftColumns,
  createdBy: applications.createdBy,
  branchId: applications.branchId,
  currentStep: applications.currentStep,
  tenorApproved: applications.tenorApproved,
  loanAmount: applications.loanAmount,
  submittedAt: applications.submittedAt,
};

/** Akses tabel `application.applications` (technical-specs 06 §6.9). */
@Injectable()
export class ApplicationsRepository {
  async findById(tx: Tx, id: string): Promise<ApplicationProcessRow | null> {
    const [row] = await tx.select(processColumns).from(applications).where(eq(applications.id, id));
    return row ?? null;
  }

  async findByLoanId(tx: Tx, loanId: string): Promise<ApplicationProcessRow | null> {
    const [row] = await tx.select(processColumns).from(applications).where(eq(applications.loanId, loanId));
    return row ?? null;
  }

  async findMany(tx: Tx, ids: readonly string[]): Promise<ApplicationProcessRow[]> {
    if (ids.length === 0) return [];
    return tx
      .select(processColumns)
      .from(applications)
      .where(inArray(applications.id, [...ids]));
  }

  async findDetail(tx: Tx, key: ApplicationKey): Promise<DetailRow | null> {
    const where = "id" in key ? eq(applications.id, key.id) : eq(applications.loanId, key.loanId);
    const [row] = await tx.select(detailColumns).from(applications).where(where);
    return row ?? null;
  }

  async insert(tx: Tx, row: typeof applications.$inferInsert): Promise<void> {
    await tx.insert(applications).values(row);
  }

  /** Pengajuan yang dibuat `createdBy`; milik user lain sama dengan tidak ada (AC-49.06). */
  async findOwned(tx: Tx, id: string, createdBy: string): Promise<DraftRow | null> {
    const [row] = await tx
      .select(draftColumns)
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.createdBy, createdBy)));
    return row ?? null;
  }

  /** Seperti `findOwned`, dengan baris terkunci sampai transaksi simpan section selesai. */
  async lockOwned(tx: Tx, id: string, createdBy: string): Promise<DraftRow | null> {
    const [row] = await tx
      .select(draftColumns)
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.createdBy, createdBy)))
      .for("update");
    return row ?? null;
  }

  async updateDraft(tx: Tx, id: string, changes: DraftChanges, userId: string): Promise<void> {
    await tx
      .update(applications)
      .set({ ...changes, updatedAt: new Date(), updatedBy: userId })
      .where(eq(applications.id, id));
  }

  /** Draft dikirim: `ON_PROGRESS`, waktu dan pengirim dicatat, catatan pengembalian dihapus (api-specs 12 §12.8). */
  async markSubmitted(tx: Tx, id: string, userId: string, at: Date): Promise<void> {
    await tx
      .update(applications)
      .set({
        status: "ON_PROGRESS",
        submittedAt: at,
        submittedBy: userId,
        returnNote: null,
        updatedAt: at,
        updatedBy: userId,
      })
      .where(eq(applications.id, id));
  }

  /** Mengunci baris sampai transaksi selesai agar perubahan status tidak saling menimpa. */
  async lockStatus(tx: Tx, id: string): Promise<ApplicationStatus | null> {
    const [row] = await tx
      .select({ status: applications.status })
      .from(applications)
      .where(eq(applications.id, id))
      .for("update");
    return row?.status ?? null;
  }

  async updateStatus(
    tx: Tx,
    id: string,
    changes: { status: ApplicationStatus; returnNote: string | null; currentStep?: StepCode | null },
    userId: string | null,
  ): Promise<void> {
    await tx
      .update(applications)
      .set({ ...changes, updatedAt: new Date(), updatedBy: userId })
      .where(eq(applications.id, id));
  }

  async updateCurrentStep(tx: Tx, id: string, currentStep: StepCode): Promise<void> {
    await tx.update(applications).set({ currentStep, updatedAt: new Date() }).where(eq(applications.id, id));
  }

  async updateApprovedTerms(
    tx: Tx,
    id: string,
    terms: { tenorApproved: number; loanAmount: string },
    userId: string | null,
  ): Promise<void> {
    await tx
      .update(applications)
      .set({ ...terms, updatedAt: new Date(), updatedBy: userId })
      .where(eq(applications.id, id));
  }
}

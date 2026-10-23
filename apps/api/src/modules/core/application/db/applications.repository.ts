import type { ApplicationStatus, FormSection, ProductCategory, StepCode } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { applicationPersonals, applications } from "./schema.js";

export interface ApplicationProcessRow {
  id: string;
  tenantId: string;
  loanId: string;
  productId: string;
  status: ApplicationStatus;
  createdAt: Date;
  submittedAt: Date | null;
  submittedBy: string | null;
}

const processColumns = {
  id: applications.id,
  tenantId: applications.tenantId,
  loanId: applications.loanId,
  productId: applications.productId,
  status: applications.status,
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
  currentSection: FormSection;
  returnNote: string | null;
}

export interface DraftListRow {
  id: string;
  loanId: string;
  fullName: string;
  productId: string;
  requestedLimit: string | null;
  currentSection: FormSection;
  returnNote: string | null;
  updatedAt: Date;
}

/** Draft milik pembuatnya, dengan pencarian Loan ID atau nama (api-specs 12 §12.4, AC-49.06). */
export interface DraftFilter {
  createdBy: string;
  q?: string;
}

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
  currentSection: applications.currentSection,
  returnNote: applications.returnNote,
};

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

/** Akses tabel `application.applications` (technical-specs 06 §6.9). */
@Injectable()
export class ApplicationsRepository {
  async findById(tx: Tx, id: string): Promise<ApplicationProcessRow | null> {
    const [row] = await tx.select(processColumns).from(applications).where(eq(applications.id, id));
    return row ?? null;
  }

  async findMany(tx: Tx, ids: readonly string[]): Promise<ApplicationProcessRow[]> {
    if (ids.length === 0) return [];
    return tx
      .select(processColumns)
      .from(applications)
      .where(inArray(applications.id, [...ids]));
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

  async listDrafts(
    tx: Tx,
    filter: DraftFilter,
    page: { offset: number; limit: number; direction: "asc" | "desc" },
  ): Promise<DraftListRow[]> {
    const order = page.direction === "asc" ? asc : desc;
    return tx
      .select({
        id: applications.id,
        loanId: applications.loanId,
        fullName: applicationPersonals.fullName,
        productId: applications.productId,
        requestedLimit: applications.requestedLimit,
        currentSection: applications.currentSection,
        returnNote: applications.returnNote,
        updatedAt: applications.updatedAt,
      })
      .from(applications)
      .innerJoin(applicationPersonals, eq(applicationPersonals.applicationId, applications.id))
      .where(this.draftsOf(filter))
      .orderBy(order(applications.updatedAt), asc(applications.id))
      .limit(page.limit)
      .offset(page.offset);
  }

  async countDrafts(tx: Tx, filter: DraftFilter): Promise<number> {
    const [row] = await tx
      .select({ total: count() })
      .from(applications)
      .innerJoin(applicationPersonals, eq(applicationPersonals.applicationId, applications.id))
      .where(this.draftsOf(filter));
    return row?.total ?? 0;
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

  private draftsOf(filter: DraftFilter): SQL | undefined {
    const pattern = filter.q === undefined ? undefined : `%${escapeLike(filter.q)}%`;
    return and(
      eq(applications.status, "DRAFT"),
      eq(applications.createdBy, filter.createdBy),
      pattern === undefined
        ? undefined
        : or(ilike(applications.loanId, pattern), ilike(applicationPersonals.fullName, pattern)),
    );
  }
}
